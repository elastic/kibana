/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createQueryFilterClauses } from '../../utils/build_query';
import { reduceFields } from '../../utils/build_query/reduce_fields';
import { hostFieldsMap } from '../ecs_fields';
import { RequestOptions } from '../framework';

import { buildFieldsTermAggregation } from './helpers';

export const buildHostsQuery = ({
  fields,
  filterQuery,
  pagination: { limit, cursor },
  sourceConfiguration: {
    fields: { timestamp },
    logAlias,
    auditbeatAlias,
    packetbeatAlias,
    winlogbeatAlias,
  },
  timerange: { from, to },
}: RequestOptions) => {
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
          terms: { size: limit + 1, field: 'host.name', order: { lastSeen: 'desc' } },
          aggs: {
            lastSeen: { max: { field: '@timestamp' } },
            firstSeen: { min: { field: '@timestamp' } },
            ...buildFieldsTermAggregation(
              esFields.filter(field => !['@timestamp', '_id'].includes(field))
            ),
          },
        },
      },
      query: { bool: { filter } },
      size: 0,
      track_total_hits: true,
    },
  };

  return dslQuery;
};
