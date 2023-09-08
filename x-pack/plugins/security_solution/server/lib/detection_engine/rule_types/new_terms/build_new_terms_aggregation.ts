/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Moment } from 'moment';
import type { ESSearchResponse } from '@kbn/es-types';
import type { SignalSource } from '../types';

export type RecentTermsAggResult = ESSearchResponse<
  SignalSource,
  { body: { aggregations: ReturnType<typeof buildRecentTermsAgg> } }
>;

export type NewTermsAggResult = ESSearchResponse<
  SignalSource,
  { body: { aggregations: ReturnType<typeof buildNewTermsAgg> } }
>;

export type DocFetchAggResult = ESSearchResponse<
  SignalSource,
  { body: { aggregations: ReturnType<typeof buildDocFetchAgg> } }
>;

const PAGE_SIZE = 10000;

/**
 * Creates an aggregation that pages through all terms. Used to find the terms that have appeared recently,
 * without regard to whether or not they're actually new.
 */
export const buildRecentTermsAgg = ({
  fields,
  after,
}: {
  fields: string[];
  after: Record<string, string | number | null> | undefined;
}) => {
  const sources = fields.map((field) => ({
    [field]: {
      terms: {
        field,
      },
    },
  }));

  return {
    new_terms: {
      composite: {
        sources,
        size: PAGE_SIZE,
        after,
      },
    },
  };
};

/**
 * Creates an aggregation that returns a bucket for each term in the `include` array
 * that only appears after the time `newValueWindowStart`.
 */
export const buildNewTermsAgg = ({
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
        // include actually accepts strings or numbers, so we cast to string[] to make TS happy
        include: include as string[],
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

/**
 * Creates an aggregation that fetches the oldest document for each value in the `include` array.
 */
export const buildDocFetchAgg = ({
  field,
  timestampField,
  include,
}: {
  field: string;
  timestampField: string;
  include: Array<string | number>;
}) => {
  return {
    new_terms: {
      terms: {
        field,
        size: PAGE_SIZE,
        // include actually accepts strings or numbers, so we cast to string[] to make TS happy
        include: include as string[],
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
      },
    },
  };
};
