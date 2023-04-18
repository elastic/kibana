/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESSearchResponse } from '@kbn/es-types';
import type { SignalSource } from '../../types';

export type EventGroupingMultiBucketAggregationResult = ESSearchResponse<
  SignalSource,
  {
    body: {
      aggregations: ReturnType<typeof buildGroupByFieldAggregation>;
    };
  }
>;

interface GetGroupByFieldAggregationArgs {
  groupByFields: string[];
  maxSignals: number;
  aggregatableTimestampField: string;
  topHitsSize?: number;
}

export const buildGroupByFieldAggregation = ({
  groupByFields,
  maxSignals,
  aggregatableTimestampField,
  topHitsSize = 1,
}: GetGroupByFieldAggregationArgs) => ({
  eventGroups: {
    composite: {
      sources: groupByFields.map((field) => ({
        [field]: {
          terms: {
            field,
            missing_bucket: true,
            missing_order: 'last' as const,
          },
        },
      })),
      size: maxSignals,
    },
    aggs: {
      topHits: {
        top_hits: {
          size: topHitsSize,
          sort: [
            {
              [aggregatableTimestampField]: {
                order: 'asc' as const,
                unmapped_type: 'date',
              },
            },
          ],
        },
      },
      max_timestamp: {
        max: {
          field: aggregatableTimestampField,
        },
      },
      min_timestamp: {
        min: {
          field: aggregatableTimestampField,
        },
      },
    },
  },
});
