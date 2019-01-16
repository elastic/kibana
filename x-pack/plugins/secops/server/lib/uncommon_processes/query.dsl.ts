/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createQueryFilterClauses } from '../../utils/build_query';
import { reduceFields } from '../../utils/build_query/reduce_fields';
import { hostFieldsMap, processFieldsMap, userFieldsMap } from '../ecs_fields';
import { FilterQuery } from '../types';
import { UncommonProcessesRequestOptions } from './types';

export const buildQuery = (options: UncommonProcessesRequestOptions) => {
  const { to, from } = options.timerange;
  const { limit } = options.pagination;
  const { fields, filterQuery } = options;
  const processUserFields = reduceFields(fields, { ...processFieldsMap, ...userFieldsMap });
  const hostFields = reduceFields(fields, hostFieldsMap);
  const filter = [
    ...createQueryFilterClauses(filterQuery as FilterQuery),
    {
      range: {
        [options.sourceConfiguration.fields.timestamp]: {
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
    index: options.sourceConfiguration.auditbeatAlias,
    ignoreUnavailable: true,
    body: {
      aggregations: {
        ...agg,
        group_by_process: {
          terms: {
            size: limit,
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
                _source: processUserFields,
              },
            },
            host_count: {
              cardinality: {
                field: 'host.id',
              },
            },
            hosts: {
              terms: {
                field: 'host.id',
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
