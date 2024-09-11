/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityDefinition } from '@kbn/entities-schema';
import { calculateOffset } from '../helpers/calculate_offset';

export function generateHistoryMetadataAggregations(definition: EntityDefinition) {
  if (!definition.metadata) {
    return {};
  }
  return definition.metadata.reduce((aggs, metadata) => {
    let agg;
    if (metadata.aggregation.type === 'terms') {
      agg = {
        terms: {
          field: metadata.source,
          size: metadata.aggregation.limit,
        },
      };
    } else if (metadata.aggregation.type === 'top_metrics') {
      agg = {
        top_metrics: {
          metrics: [{ field: metadata.source }],
          sort: metadata.aggregation.sort,
        },
      };
    }

    return {
      ...aggs,
      [`entity.metadata.${metadata.destination}`]: agg,
    };
  }, {});
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
              field: metadata.destination,
              size: metadata.aggregation.limit,
            },
          },
        },
      },
    }),
    {}
  );
}
