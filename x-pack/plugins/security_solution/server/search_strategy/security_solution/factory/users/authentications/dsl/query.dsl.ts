/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { UserAuthenticationsRequestOptions } from '../../../../../../../common/search_strategy/security_solution/users/authentications';
import { sourceFieldsMap, hostFieldsMap } from '../../../../../../../common/ecs/ecs_fields';
import { createQueryFilterClauses } from '../../../../../../utils/build_query';
import { authenticationsLastSuccessFields } from '../helpers';

export const auditdFieldsMap: Readonly<Record<string, unknown>> = {
  latest: '@timestamp',
  'lastSuccess': {
    'timestamp': '@timestamp',
    ...sourceFieldsMap,
    ...hostFieldsMap,
  },
  'lastFailure': {
    'timestamp': '@timestamp',
    ...sourceFieldsMap,
    ...hostFieldsMap,
  },
};

export const buildQuery = ({
  filterQuery,
  stackByField,
  timerange: { from, to },
  pagination: { querySize },
  defaultIndex,
  docValueFields,
}: UserAuthenticationsRequestOptions) => {
  const esFields = authenticationsLastSuccessFields;

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
            ] as estypes.AggregationsTermsAggregationOrder,
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
      fields: [...esFields, ...(docValueFields && !isEmpty(docValueFields) ? docValueFields : []), 'host*', 'source*', '@timestamp'],
    },
    track_total_hits: false,
  };

  return dslQuery;
};
