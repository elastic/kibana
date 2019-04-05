/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createQueryFilterClauses } from '../../utils/build_query';
import { reduceFields } from '../../utils/build_query/reduce_fields';
import { hostFieldsMap } from '../ecs_fields';
import { RequestOptions } from '../framework';

export const hostsFieldsMap: Readonly<Record<string, string>> = {
  lastBeat: '@timestamp',
  ...{ ...hostFieldsMap },
};

export const buildQuery = ({
  fields,
  filterQuery,
  timerange: { from, to },
  pagination: { limit, cursor },
  sourceConfiguration: {
    fields: { timestamp },
    logAlias,
    auditbeatAlias,
    packetbeatAlias,
    winlogbeatAlias,
  },
}: RequestOptions) => {
  const esFields = reduceFields(fields, hostsFieldsMap);

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

  const agg = {
    host_count: {
      cardinality: {
        field: 'host.id',
      },
    },
  };

  const dslQuery = {
    allowNoIndices: true,
    index: [logAlias, auditbeatAlias, packetbeatAlias, winlogbeatAlias],
    ignoreUnavailable: true,
    body: {
      aggregations: {
        ...agg,
        group_by_host: {
          terms: {
            size: limit + 1,
            field: 'host.id',
            order: {
              firstSeen: 'asc',
            },
          },
          aggs: {
            firstSeen: {
              min: {
                field: '@timestamp',
              },
            },
            host: {
              top_hits: {
                size: 1,
                _source: esFields,
                sort: [
                  {
                    '@timestamp': 'desc',
                  },
                ],
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
      track_total_hits: false,
    },
  };

  return dslQuery;
};
