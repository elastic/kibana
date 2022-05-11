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

export type InitialNewTermsAggregationResult = ESSearchResponse<
  SignalSource,
  { body: { aggregations: ReturnType<typeof buildInitialNewTermsAggregation> } }
>;

const PAGE_SIZE = 10000;

export const buildNewTermsAggregation = ({
  newValueWindowStart,
  field,
  timestampField,
  include,
}: {
  newValueWindowStart: Moment;
  field: string;
  timestampField: string;
  include: Array<string | number>;
}) => {
  return {
    new_terms: {
      terms: {
        field,
        size: PAGE_SIZE,
        // include actually accepts strings or numbers, not sure why the TS type says it doesn't
        include: include as string[],
      },
      aggs: {
        /* docs: {
          top_hits: {
            size: 1,
            sort: [
              {
                [timestampField]: 'asc' as const,
              },
            ],
          },
        },*/
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

/**
 * Creates an aggregation that pages through all terms. Used to find the terms that have appeared recently,
 * without regard to whether or not they're actually new.
 */
export const buildInitialNewTermsAggregation = ({
  field,
  after,
}: {
  field: string;
  after: Record<string, string | number | null> | undefined;
}) => {
  return {
    new_terms: {
      composite: {
        sources: [
          {
            [field]: {
              terms: {
                field,
              },
            },
          },
        ],
        size: PAGE_SIZE,
        after,
      },
    },
  };
};

/**
 *
 */
export const buildHistoryTermsAggregation = ({
  newValueWindowStart,
  field,
  maxSignals,
  timestampField,
  after,
}: {
  newValueWindowStart: Moment;
  field: string;
  maxSignals: number;
  timestampField: string;
  after: Record<string, string | number | null>;
}) => {
  return {
    new_terms: {
      composite: {
        sources: [
          {
            [field]: {
              terms: {
                field,
              },
            },
          },
        ],
        size: 1000,
        after,
      },
      aggs: {
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
