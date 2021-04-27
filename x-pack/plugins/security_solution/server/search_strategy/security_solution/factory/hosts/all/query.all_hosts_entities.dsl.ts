/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import { ISearchRequestParams } from '../../../../../../../../../src/plugins/data/common';
import {
  Direction,
  HostsRequestOptions,
  SortField,
  HostsFields,
} from '../../../../../../common/search_strategy';
import { createQueryFilterClauses } from '../../../../../utils/build_query';
import { assertUnreachable } from '../../../../../../common/utility_types';

export const buildHostsQueryEntities = ({
  defaultIndex,
  docValueFields,
  filterQuery,
  pagination: { querySize },
  sort,
  timerange: { from, to },
}: HostsRequestOptions): ISearchRequestParams => {
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

  const agg = { host_count: { cardinality: { field: 'host.name' } } };

  const dslQuery = {
    allowNoIndices: true,
    index: defaultIndex,
    ignoreUnavailable: true,
    track_total_hits: false,
    body: {
      ...(!isEmpty(docValueFields) ? { docvalue_fields: docValueFields } : {}),
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
                      order: 'desc' as const,
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
    },
  };

  return dslQuery;
};

type QueryOrder = { lastSeen: Direction } | { _key: Direction };

const getQueryOrder = (sort: SortField<HostsFields>): QueryOrder => {
  switch (sort.field) {
    case HostsFields.lastSeen:
      return { lastSeen: sort.direction };
    case HostsFields.hostName:
      return { _key: sort.direction };
    default:
      return assertUnreachable(sort.field);
  }
};
