/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { set } from '@kbn/safer-lodash-set';
import { cloneDeep } from 'lodash';
import { createSingleFieldMatchEnrichment } from '../create_single_field_match_enrichment';
import type {
  CreateCriticalityEnrichment,
  DoesAssetCriticalityAvailable,
  CreateEnrichmentFunction,
} from '../types';
import { getFieldValue } from '../utils/events';
import { getAssetCriticalityIndex } from '../../../../../../../common/asset_criticality';

export const doesAssetCriticalityIndexExist: DoesAssetCriticalityAvailable = async ({
  spaceId,
  services,
}) => {
  const isAssetCriticalityIndexExist =
    await services.scopedClusterClient.asInternalUser.indices.exists({
      index: getAssetCriticalityIndex(spaceId),
    });

  return isAssetCriticalityIndexExist;
};

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
  (alertField: string): CreateEnrichmentFunction =>
  (enrichment) =>
  (event) => {
    const criticality = getFieldValue(enrichment, 'criticality_level');

    if (!criticality) {
      return event;
    }
    const newEvent = cloneDeep(event);
    if (criticality) {
      set(newEvent, alertField, criticality);
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
    createEnrichmentFunction: createEnrichmentFactoryFunction(
      '_source.kibana.alert.host.criticality_level'
    ),
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
    createEnrichmentFunction: createEnrichmentFactoryFunction(
      '_source.kibana.alert.user.criticality_level'
    ),
  });
};
