/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { searchEnrichments } from './search_enrichments';
import { makeSinleFieldMathRequest } from './utils/requests';
import type { CreateFieldsMatchEnrichment, EventsMapByEnrichments } from './types';

export const createSingleFieldMatchEnrichment: CreateFieldsMatchEnrichment = async ({
  index,
  services,
  logger,
  events,
  mappingField,
  createEnrichmentFunction,
  name,
}) => {
  logger.debug(`Enrichment ${name}: started`);

  const eventsWithField = events.filter((event) =>
    get(event, `_source.${mappingField.eventField}`)
  );
  const eventsMapByFieldValue = eventsWithField.reduce((acc, event) => {
    const eventFieldValue = get(event, `_source.${mappingField.eventField}`);

    acc[eventFieldValue] ??= [];
    acc[eventFieldValue].push(event);

    return acc;
  }, {} as { [key: string]: typeof events });

  const queryResult = makeSinleFieldMathRequest({
    events,
    mappingField,
  });

  if (queryResult.query?.bool?.should?.length === 0) {
    logger.debug(`Enrichment ${name}: events doesn't have any field to enrich`);
    return {};
  }

  const enrichments = await searchEnrichments({
    index,
    services,
    logger,
    query: queryResult,
  });

  if (enrichments.length === 0) {
    logger.debug(`Enrichment ${name}: no enrichment found`);
    return {};
  }

  const eventsMapById = enrichments.reduce<EventsMapByEnrichments>((acc, enrichment) => {
    const enrichmentValue = get(enrichment, `_source.${mappingField.enrichmentField}`);

    const eventsWithoutEnrchment = eventsMapByFieldValue[enrichmentValue];

    eventsWithoutEnrchment.forEach((event) => {
      acc[event._id] = [createEnrichmentFunction(enrichment)];
    });

    return acc;
  }, {});

  logger.debug(
    `Enrichment ${name}: finished with ${Object.keys(eventsMapById).length} events to enrich`
  );
  return eventsMapById;
};
