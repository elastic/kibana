/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createQueryFilterClauses } from '../../utils/build_query';
import { reduceFields } from '../../utils/build_query/reduce_fields';
import { hostFieldsMap, processFieldsMap, userFieldsMap } from '../ecs_fields';
import { RequestOptions } from '../framework';

export const buildQuery = ({
  fields,
  filterQuery,
  timerange: { from, to },
  pagination: { limit },
  sourceConfiguration: {
    fields: { timestamp },
    auditbeatAlias,
  },
}: RequestOptions) => {
  const processUserFields = reduceFields(fields, { ...processFieldsMap, ...userFieldsMap });
  const hostFields = reduceFields(fields, hostFieldsMap);
  const filter = [
    ...createQueryFilterClauses(filterQuery),
    { term: { 'event.kind': 'state' } },
    { term: { 'event.module': 'system' } },
    { term: { 'event.dataset': 'process' } },
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
    process_count: {
      cardinality: {
        field: 'process.name',
      },
    },
  };

  const dslQuery = {
    allowNoIndices: true,
    index: auditbeatAlias,
    ignoreUnavailable: true,
    body: {
      aggregations: {
        ...agg,
        group_by_process: {
          terms: {
            size: limit + 1,
            field: 'process.name',
            order: [
              {
                host_count: 'asc',
              },
              {
                _count: 'asc',
              },
              {
                _key: 'asc',
              },
            ],
          },
          aggregations: {
            process: {
              top_hits: {
                size: 1,
                sort: [{ '@timestamp': { order: 'desc' } }],
                _source: processUserFields,
              },
            },
            host_count: {
              cardinality: {
                field: 'host.name',
              },
            },
            hosts: {
              terms: {
                field: 'host.name',
              },
              aggregations: {
                host: {
                  top_hits: {
                    size: 1,
                    _source: hostFields,
                  },
                },
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
    },
    size: 0,
    track_total_hits: false,
  };

  return dslQuery;
};
