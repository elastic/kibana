/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityDefinition } from '@kbn/entities-schema';
import { ENTITY_DEFAULT_METADATA_LIMIT } from '../../../../common/constants_entities';
import { calculateOffset } from '../helpers/calculate_offset';

export function generateHistoryMetadataAggregations(definition: EntityDefinition) {
  if (!definition.metadata) {
    return {};
  }
  return definition.metadata.reduce(
    (aggs, metadata) => ({
      ...aggs,
      [`entity.metadata.${metadata.destination ?? metadata.source}`]: {
        terms: {
          field: metadata.source,
          size: metadata.limit ?? ENTITY_DEFAULT_METADATA_LIMIT,
        },
      },
    }),
    {}
  );
}

export function generateLatestMetadataAggregations(definition: EntityDefinition) {
  if (!definition.metadata) {
    return {};
  }

  const offsetInSeconds = calculateOffset(definition);

  return definition.metadata.reduce(
    (aggs, metadata) => ({
      ...aggs,
      [`entity.metadata.${metadata.destination}`]: {
        filter: {
          range: {
            '@timestamp': {
              gte: `now-${offsetInSeconds}s`,
            },
          },
        },
        aggs: {
          data: {
            terms: {
              field: metadata.destination ?? metadata.source,
              size: metadata.limit ?? ENTITY_DEFAULT_METADATA_LIMIT,
            },
          },
        },
      },
    }),
    {}
  );
}
