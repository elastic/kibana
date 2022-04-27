/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Moment } from 'moment';
import { ESSearchResponse } from '@kbn/core/types/elasticsearch';
import { SignalSource } from '../../signals/types';

export type NewTermsAggregationResult = ESSearchResponse<
  SignalSource,
  { body: { aggregations: ReturnType<typeof buildNewTermsAggregation> } }
>;

export const buildNewTermsAggregation = ({
  newValueWindowStart,
  field,
  maxSignals,
  timestampField,
}: {
  newValueWindowStart: Moment;
  field: string;
  maxSignals: number;
  timestampField: string;
}) => {
  return {
    new_terms: {
      terms: {
        field,
        size: maxSignals,
        order: {
          first_seen: 'desc' as const,
        },
      },
      aggs: {
        docs: {
          top_hits: {
            size: 1,
            sort: [
              {
                [timestampField]: 'asc' as const,
              },
            ],
          },
        },
        first_seen: {
          min: {
            field: timestampField,
          },
        },
        filtering_agg: {
          bucket_selector: {
            buckets_path: {
              first_seen_value: 'first_seen',
            },
            script: {
              params: {
                start_time: newValueWindowStart.valueOf(),
              },
              source: 'params.first_seen_value > params.start_time',
            },
          },
        },
      },
    },
  };
};
