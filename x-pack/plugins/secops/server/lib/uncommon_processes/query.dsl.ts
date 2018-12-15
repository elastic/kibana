/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { merge } from 'lodash/fp';
import { createQueryFilterClauses } from '../../utils/build_query';
import { reduceFields } from '../../utils/build_query/reduce_fields';
import { FilterQuery } from '../types';
import { UncommonProcessesRequestOptions } from './types';

export const processFieldsMap: Readonly<Record<string, string>> = {
  name: 'process.name',
  title: 'process.title',
};

export const hostFieldsMap: Readonly<Record<string, string>> = {
  hosts: 'host.name',
};

export const buildQuery = (options: UncommonProcessesRequestOptions) => {
  const { to, from } = options.timerange;
  const { limit, cursor } = options.pagination;
  const { fields, filterQuery } = options;
  const processFields = reduceFields(fields, processFieldsMap);
  const hostFields = reduceFields(fields, hostFieldsMap);

  const filter = [
    ...createQueryFilterClauses(filterQuery as FilterQuery),
    {
      range: {
        [options.sourceConfiguration.fields.timestamp]: {
          gte: to,
          lte: from,
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
                _source: processFields,
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

  // TODO: Implement cursors if it is possible
  if (cursor) {
    return merge(dslQuery, {
      body: {
        aggregations: {
          group_by_process: {
            composite: {
              after: {
                host_name: cursor,
              },
            },
          },
        },
      },
    });
  }

  return dslQuery;
};
