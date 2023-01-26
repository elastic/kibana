/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface GetGroupByFieldAggregationArgs {
  groupByFields: string[];
  maxSignals: number;
  aggregatableTimestampField: string;
}

export const buildGroupByFieldAggregation = ({
  groupByFields,
  maxSignals,
  aggregatableTimestampField,
}: GetGroupByFieldAggregationArgs) => ({
  eventGroups: {
    composite: {
      sources: groupByFields.map((field) => ({
        [field]: {
          terms: {
            field,
            missing_bucket: true,
          },
        },
      })),
      size: maxSignals,
    },
    aggs: {
      topHits: {
        top_hits: {
          size: 1,
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
