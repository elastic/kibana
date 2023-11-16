/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ThresholdNormalized } from '../../../../../common/api/detection_engine/model/rule_schema';
import { shouldFilterByCardinality } from './utils';

export const buildThresholdMultiBucketAggregation = ({
  threshold,
  aggregatableTimestampField,
  sortKeys,
}: {
  threshold: ThresholdNormalized;
  aggregatableTimestampField: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sortKeys: Record<string, any> | undefined;
}) => {
  return {
    thresholdTerms: {
      composite: {
        sources: threshold.field.map((term, i) => ({
          [term]: {
            terms: {
              field: term,
            },
          },
        })),
        after: sortKeys,
        size: 10000,
      },
      aggs: {
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
        ...(shouldFilterByCardinality(threshold)
          ? {
              cardinality_count: {
                cardinality: {
                  field: threshold.cardinality[0].field,
                },
              },
              cardinality_check: {
                bucket_selector: {
                  buckets_path: {
                    cardinalityCount: 'cardinality_count',
                  },
                  script: `params.cardinalityCount >= ${threshold.cardinality[0].value}`, // TODO: user-selected cardinality operator?
                },
              },
            }
          : {}),
        count_check: {
          bucket_selector: {
            buckets_path: {
              docCount: '_count',
            },
            script: `params.docCount >= ${threshold.value}`,
          },
        },
      },
    },
  };
};

export const buildThresholdSingleBucketAggregation = ({
  threshold,
  aggregatableTimestampField,
}: {
  threshold: ThresholdNormalized;
  aggregatableTimestampField: string;
}) => ({
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
  ...(shouldFilterByCardinality(threshold)
    ? {
        cardinality_count: {
          cardinality: {
            field: threshold.cardinality[0].field,
          },
        },
      }
    : {}),
});
