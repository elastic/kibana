/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import {
  ALERT_HOST_CRITICALITY,
  ALERT_USER_CRITICALITY,
} from '../../../../../../../common/field_maps/field_names';
import { createSingleFieldMatchEnrichment } from '../create_single_field_match_enrichment';
import type { CreateCriticalityEnrichment, CreateEnrichmentFunction } from '../types';
import { getFieldValue } from '../utils/events';
import { getAssetCriticalityIndex } from '../../../../../../../common/entity_analytics/asset_criticality';

const enrichmentResponseFields = ['id_value', 'criticality_level'];

const getExtraFiltersForEnrichment = (field: string) => [
  {
    match: {
      id_field: {
        query: field,
      },
    },
  },
];

const createEnrichmentFactoryFunction =
  (
    alertField: typeof ALERT_HOST_CRITICALITY | typeof ALERT_USER_CRITICALITY
  ): CreateEnrichmentFunction =>
  (enrichment) =>
  (event) => {
    const criticality = getFieldValue(enrichment, 'criticality_level');

    if (!criticality) {
      return event;
    }
    const newEvent = cloneDeep(event);
    if (criticality && newEvent._source) {
      newEvent._source[alertField] = criticality;
    }
    return newEvent;
  };

export const createHostAssetCriticalityEnrichments: CreateCriticalityEnrichment = async ({
  services,
  logger,
  events,
  spaceId,
}) => {
  return createSingleFieldMatchEnrichment({
    name: 'Host Asset Criticality',
    index: [getAssetCriticalityIndex(spaceId)],
    services,
    logger,
    events,
    mappingField: {
      eventField: 'host.name',
      enrichmentField: 'id_value',
    },
    enrichmentResponseFields,
    extraFilters: getExtraFiltersForEnrichment('host.name'),
    createEnrichmentFunction: createEnrichmentFactoryFunction(ALERT_HOST_CRITICALITY),
  });
};

export const createUserAssetCriticalityEnrichments: CreateCriticalityEnrichment = async ({
  services,
  logger,
  events,
  spaceId,
}) => {
  return createSingleFieldMatchEnrichment({
    name: 'User Asset Criticality',
    index: [getAssetCriticalityIndex(spaceId)],
    services,
    logger,
    events,
    mappingField: {
      eventField: 'user.name',
      enrichmentField: 'id_value',
    },
    enrichmentResponseFields,
    extraFilters: getExtraFiltersForEnrichment('user.name'),
    createEnrichmentFunction: createEnrichmentFactoryFunction(ALERT_USER_CRITICALITY),
  });
};
