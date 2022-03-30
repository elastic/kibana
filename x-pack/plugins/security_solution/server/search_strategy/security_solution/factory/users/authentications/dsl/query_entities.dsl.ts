/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { createQueryFilterClauses } from '../../../../../../utils/build_query';
import { UserAuthenticationsRequestOptions } from '../../../../../../../common/search_strategy';

export const buildQueryEntities = ({
  filterQuery,
  timerange: { from, to },
  pagination: { querySize },
  defaultIndex,
  docValueFields,
  stackByField,
}: UserAuthenticationsRequestOptions) => {
  const filter = [
    ...createQueryFilterClauses(filterQuery),
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
      ...(!isEmpty(docValueFields) ? { docvalue_fields: docValueFields } : {}),
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
              { successes: 'desc' },
              { failures: 'desc' },
            ] as estypes.AggregationsTermsAggregationOrder,
          },
          aggs: {
            failures: {
              sum: {
                field: 'metrics.event.authentication.failure.value_count',
              },
            },
            successes: {
              sum: {
                field: 'metrics.event.authentication.success.value_count',
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
    },
    track_total_hits: false,
  };

  return dslQuery;
};
