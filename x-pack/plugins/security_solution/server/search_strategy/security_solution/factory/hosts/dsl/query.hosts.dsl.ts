/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty, isString } from 'lodash/fp';
import { ISearchRequestParams } from '../../../../../../../../../src/plugins/data/common';
import {
  Direction,
  HostsRequestOptions,
  SortField,
} from '../../../../../../common/search_strategy/security_solution';
import { assertUnreachable, createQueryFilterClauses } from '../../../../../utils/build_query';

export const buildHostsQuery = ({
  defaultIndex,
  docValueFields,
  filterQuery,
  pagination: { querySize },
  sort,
  timerange: { from, to },
}: HostsRequestOptions): ISearchRequestParams => {
  const filter = [
    ...createQueryFilterClauses(isString(filterQuery) ? JSON.parse(filterQuery) : filterQuery),
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

  const agg = { host_count: { cardinality: { field: 'host.name' } } };

  const dslQuery = {
    allowNoIndices: true,
    index: defaultIndex,
    ignoreUnavailable: true,
    body: {
      ...(isEmpty(docValueFields) ? { docvalue_fields: docValueFields } : {}),
      aggregations: {
        ...agg,
        host_data: {
          terms: { size: querySize, field: 'host.name', order: getQueryOrder(sort) },
          aggs: {
            lastSeen: { max: { field: '@timestamp' } },
            os: {
              top_hits: {
                size: 1,
                sort: [
                  {
                    '@timestamp': {
                      order: 'desc',
                    },
                  },
                ],
                _source: {
                  includes: ['host.os.*'],
                },
              },
            },
          },
        },
      },
      query: { bool: { filter } },
      size: 0,
      track_total_hits: false,
    },
  };

  return dslQuery;
};

type QueryOrder = { lastSeen: Direction } | { _key: Direction };

const getQueryOrder = (sort: SortField): QueryOrder => {
  switch (sort.field) {
    case 'lastSeen':
      return { lastSeen: sort.direction };
    case 'hostName':
      return { _key: sort.direction };
    default:
      return assertUnreachable(sort.field);
  }
};
