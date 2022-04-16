/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import type { ISearchRequestParams } from '@kbn/data-plugin/common';
import { Direction } from '../../../../../../common/search_strategy';
import { createQueryFilterClauses } from '../../../../../utils/build_query';
import { UsersRequestOptions } from '../../../../../../common/search_strategy/security_solution/users/all';
import {
  SortUsersField,
  UsersFields,
} from '../../../../../../common/search_strategy/security_solution/users/common';
import { assertUnreachable } from '../../../../../../common/utility_types';

export const buildUsersQuery = ({
  defaultIndex,
  docValueFields,
  filterQuery,
  pagination: { querySize },
  sort,
  timerange: { from, to },
}: UsersRequestOptions): ISearchRequestParams => {
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
    track_total_hits: false,
    body: {
      ...(!isEmpty(docValueFields) ? { docvalue_fields: docValueFields } : {}),
      aggregations: {
        user_count: { cardinality: { field: 'user.name' } },
        user_data: {
          terms: { size: querySize, field: 'user.name', order: getQueryOrder(sort) },
          aggs: {
            lastSeen: { max: { field: '@timestamp' } },
            domain: {
              top_hits: {
                size: 1,
                sort: [
                  {
                    '@timestamp': {
                      order: 'desc' as const,
                    },
                  },
                ],
                _source: false,
              },
            },
          },
        },
      },
      query: { bool: { filter } },
      _source: false,
      fields: ['user.*', '@timestamp'],
      size: 0,
    },
  };

  return dslQuery;
};

type QueryOrder = { lastSeen: Direction } | { domain: Direction } | { _key: Direction };

const getQueryOrder = (sort: SortUsersField): QueryOrder => {
  switch (sort.field) {
    case UsersFields.lastSeen:
      return { lastSeen: sort.direction };
    case UsersFields.name:
      return { _key: sort.direction };
    default:
      return assertUnreachable(sort.field);
  }
};
