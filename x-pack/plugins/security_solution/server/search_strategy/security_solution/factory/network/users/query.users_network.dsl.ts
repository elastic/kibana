/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assertUnreachable } from '../../../../../../common/utility_types';
import {
  Direction,
  SortField,
  NetworkUsersRequestOptions,
  NetworkUsersFields,
} from '../../../../../../common/search_strategy';
import { createQueryFilterClauses } from '../../../../../utils/build_query';

export const buildUsersQuery = ({
  ip,
  sort,
  filterQuery,
  flowTarget,
  pagination: { querySize },
  defaultIndex,
  timerange: { from, to },
}: NetworkUsersRequestOptions) => {
  const filter = [
    ...createQueryFilterClauses(filterQuery),
    {
      range: {
        '@timestamp': { gte: from, lte: to, format: 'strict_date_optional_time' },
      },
    },
    { term: { [`${flowTarget}.ip`]: ip } },
  ];

  const dslQuery = {
    allow_no_indices: true,
    index: defaultIndex,
    ignore_unavailable: true,
    track_total_hits: false,
    body: {
      aggs: {
        user_count: {
          cardinality: {
            field: 'user.name',
          },
        },
        users: {
          terms: {
            field: 'user.name',
            size: querySize,
            order: {
              ...getQueryOrder(sort),
            },
          },
          aggs: {
            id: {
              terms: {
                field: 'user.id',
              },
            },
            groupId: {
              terms: {
                field: 'user.group.id',
              },
            },
            groupName: {
              terms: {
                field: 'user.group.name',
              },
            },
          },
        },
      },
      query: {
        bool: {
          filter,
          must_not: [
            {
              term: {
                'event.category': 'authentication',
              },
            },
          ],
        },
      },
      size: 0,
    },
  };

  return dslQuery;
};

type QueryOrder = { _count: Direction } | { _key: Direction };

const getQueryOrder = (sort: SortField<NetworkUsersFields>): QueryOrder => {
  switch (sort.field) {
    case NetworkUsersFields.name:
      return { _key: sort.direction };
    case NetworkUsersFields.count:
      return { _count: sort.direction };
    default:
      return assertUnreachable(sort.field);
  }
};
