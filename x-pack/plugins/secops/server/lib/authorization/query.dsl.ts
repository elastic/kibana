/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createQueryFilterClauses } from '../../utils/build_query';
import { reduceFields } from '../../utils/build_query/reduce_fields';
import { FilterQuery } from '../types';
import { AuthorizationsRequestOptions } from './types';

export const processFieldsMap: Readonly<Record<string, string>> = {
  name: 'process.name',
  title: 'process.title',
};

export const hostFieldsMap: Readonly<Record<string, string>> = {
  'hosts.id': 'host.id',
  'hosts.name': 'host.name',
};

export const buildQuery = (options: AuthorizationsRequestOptions) => {
  const { to, from } = options.timerange;
  const { limit } = options.pagination;
  const { fields, filterQuery } = options;
  const processFields = reduceFields(fields, processFieldsMap);
  const hostFields = reduceFields(fields, hostFieldsMap);

  // console.log('----> authorization from:', to);
  // console.log('----> authorization to:', to);

  const filter = [
    ...createQueryFilterClauses(filterQuery as FilterQuery),
    // { term: { 'event.category': 'user-login' } },
    // { term: { 'process.exe': '/user/sbin/sshd' } },
    // { terms: { 'event.type': ['user_login', 'user_start'] } },
    /*
    TODO: Add the range back at the end
    {
      range: {
        [options.sourceConfiguration.fields.timestamp]: {
          gte: from,
          lte: to,
        },
      },
    },
    */
  ];
  // console.log('filter currently is:', filter);
  const agg = {
    process_count: {
      cardinality: {
        field: 'process.name',
      },
    },
  };
  /*
  const dslQuery = {
    allowNoIndices: true,
    index: options.sourceConfiguration.auditbeatAlias,
    ignoreUnavailable: true,
    body: {
      aggregations: {
        group_by_auditd: {
          composite: {
            size: 2,
            sources: [
              {
                event: {
                  terms: {
                    field: 'auditd.data.acct',
                  },
                },
              },
            ],
          },
          aggregations: {
            users: {
              terms: {
                field: 'auditd.data.acct',
              },
              aggregations: {
                login_result: {
                  terms: {
                    field: 'auditd.result',
                  },
                  aggregations: {
                    success_failure: {
                      top_hits: {
                        size: 1,
                        sort: [{ '@timestamp': { order: 'desc' } }],
                        _source: ['@timestamp', 'source.ip'],
                      },
                    },
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
  */
  const dslQuery = {
    body: {
      query: {
        bool: {
          filter,
        },
      },
    },
  };
  return dslQuery;
};
