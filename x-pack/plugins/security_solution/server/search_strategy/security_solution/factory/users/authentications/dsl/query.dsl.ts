/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { UserAuthenticationsRequestOptions } from '../../../../../../../common/search_strategy/security_solution/users/authentications';
import { createQueryFilterClauses } from '../../../../../../utils/build_query';
import { authenticationsFields } from '../helpers';

export const buildQuery = ({
  filterQuery,
  stackByField,
  timerange: { from, to },
  pagination: { querySize },
  defaultIndex,
}: UserAuthenticationsRequestOptions) => {
  const filter = [
    ...createQueryFilterClauses(filterQuery),
    { term: { 'event.category': 'authentication' } },
    {
      range: {
        '@timestamp': {
          gte: from,
          lte: to,
          format: 'strict_date_optional_time',
        },
      },
    },
  ];
  const queryFields = authenticationsFields.filter((field) => field !== 'timestamp');

  const dslQuery = {
    allow_no_indices: true,
    index: defaultIndex,
    ignore_unavailable: true,
    body: {
      aggregations: {
        stack_by_count: {
          cardinality: {
            field: stackByField,
          },
        },
        stack_by: {
          terms: {
            size: querySize,
            field: stackByField,
            order: [
              { 'successes.doc_count': 'desc' as const },
              { 'failures.doc_count': 'desc' as const },
            ] as estypes.AggregationsAggregateOrder,
          },
          aggs: {
            failures: {
              filter: {
                term: {
                  'event.outcome': 'failure',
                },
              },
              aggs: {
                lastFailure: {
                  top_hits: {
                    size: 1,
                    _source: false,
                    sort: [{ '@timestamp': { order: 'desc' as const } }],
                  },
                },
              },
            },
            successes: {
              filter: {
                term: {
                  'event.outcome': 'success',
                },
              },
              aggs: {
                lastSuccess: {
                  top_hits: {
                    size: 1,
                    _source: false,
                    sort: [{ '@timestamp': { order: 'desc' as const } }],
                  },
                },
              },
            },
          },
        },
      },
      query: {
        bool: {
          filter,
        },
      },
      size: 0,
      _source: false,
      fields: [
        ...queryFields,
        {
          field: '@timestamp',
          format: 'strict_date_optional_time',
        },
      ],
    },
    track_total_hits: false,
  };

  return dslQuery;
};
