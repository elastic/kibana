/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISearchRequestParams } from '@kbn/search-types';
import { hostFieldsMap } from '@kbn/securitysolution-ecs';
import { HostsFields } from '../../../../../../common/api/search_strategy/hosts/model/sort';
import type { HostsRequestOptions } from '../../../../../../common/api/search_strategy';
import type { Direction } from '../../../../../../common/search_strategy';
import { createQueryFilterClauses, reduceFields } from '../../../../../utils/build_query';
import { assertUnreachable } from '../../../../../../common/utility_types';
import { HOSTS_FIELDS } from './helpers';

export const buildHostsQuery = ({
  defaultIndex,
  filterQuery,
  pagination: { querySize },
  sort,
  timerange: { from, to },
}: HostsRequestOptions): ISearchRequestParams => {
  const esFields = reduceFields(HOSTS_FIELDS, {
    ...hostFieldsMap,
  });
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
    allow_no_indices: true,
    index: defaultIndex,
    ignore_unavailable: true,
    track_total_hits: false,
    body: {
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
                _source: false,
              },
            },
          },
        },
      },
      query: { bool: { filter } },
      _source: false,
      fields: [
        ...esFields,
        {
          field: '@timestamp',
          format: 'strict_date_optional_time',
        },
      ],
      size: 0,
    },
  };

  return dslQuery;
};

type QueryOrder = { lastSeen: Direction } | { _key: Direction };

const getQueryOrder = (sort: HostsRequestOptions['sort']): QueryOrder => {
  switch (sort.field) {
    case HostsFields.lastSeen:
      return { lastSeen: sort.direction };
    case HostsFields.hostName:
      return { _key: sort.direction };
    default:
      return assertUnreachable(sort.field as never);
  }
};
