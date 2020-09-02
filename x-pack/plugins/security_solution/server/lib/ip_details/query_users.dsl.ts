/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { assertUnreachable } from '../../../common/utility_types';
import { Direction, UsersFields, UsersSortField } from '../../graphql/types';
import { createQueryFilterClauses } from '../../utils/build_query';

import { UsersRequestOptions } from './index';

export const buildUsersQuery = ({
  ip,
  sort,
  filterQuery,
  flowTarget,
  pagination: { querySize },
  defaultIndex,
  sourceConfiguration: {
    fields: { timestamp },
  },
  timerange: { from, to },
}: UsersRequestOptions) => {
  const filter = [
    ...createQueryFilterClauses(filterQuery),
    {
      range: {
        [timestamp]: { gte: from, lte: to, format: 'strict_date_optional_time' },
      },
    },
    { term: { [`${flowTarget}.ip`]: ip } },
  ];

  const dslQuery = {
    allowNoIndices: true,
    index: defaultIndex,
    ignoreUnavailable: true,
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
      track_total_hits: false,
    },
  };

  return dslQuery;
};

type QueryOrder = { _count: Direction } | { _key: Direction };

const getQueryOrder = (sort: UsersSortField): QueryOrder => {
  switch (sort.field) {
    case UsersFields.name:
      return { _key: sort.direction };
    case UsersFields.count:
      return { _count: sort.direction };
    default:
      return assertUnreachable(sort.field);
  }
};
