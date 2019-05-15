/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Direction, HostsFields, HostsSortField } from '../../graphql/types';
import { assertUnreachable, createQueryFilterClauses } from '../../utils/build_query';
import { reduceFields } from '../../utils/build_query/reduce_fields';
import { hostFieldsMap } from '../ecs_fields';

import { HostsRequestOptions } from '.';
import { buildFieldsTermAggregation } from './helpers';

export const buildHostsQuery = ({
  fields,
  filterQuery,
  pagination: { limit, cursor },
  sort,
  sourceConfiguration: {
    fields: { timestamp },
    logAlias,
    auditbeatAlias,
    packetbeatAlias,
    winlogbeatAlias,
  },
  timerange: { from, to },
}: HostsRequestOptions) => {
  const esFields = reduceFields(fields, hostFieldsMap);

  const filter = [
    ...createQueryFilterClauses(filterQuery),
    {
      range: {
        [timestamp]: {
          gte: from,
          lte: to,
        },
      },
    },
  ];

  const agg = { host_count: { cardinality: { field: 'host.name' } } };

  const dslQuery = {
    allowNoIndices: true,
    index: [logAlias, auditbeatAlias, packetbeatAlias, winlogbeatAlias],
    ignoreUnavailable: true,
    body: {
      aggregations: {
        ...agg,
        host_data: {
          terms: { size: limit + 1, field: 'host.name', order: getQueryOrder(sort) },
          aggs: {
            lastSeen: { max: { field: '@timestamp' } },
            ...buildFieldsTermAggregation(
              esFields.filter(field => !['@timestamp', '_id'].includes(field))
            ),
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

const getQueryOrder = (sort: HostsSortField): QueryOrder => {
  switch (sort.field) {
    case HostsFields.lastSeen:
      return { lastSeen: sort.direction };
    case HostsFields.hostName:
      return { _key: sort.direction };
    default:
      return assertUnreachable(sort.field);
  }
};
