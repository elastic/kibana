/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { merge } from 'lodash/fp';
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
  const { limit, cursor } = options.pagination;
  const { fields, filterQuery } = options;
  const processFields = reduceFields(fields, processFieldsMap);
  const hostFields = reduceFields(fields, hostFieldsMap);

  console.log('----> authorization from:', to);
  console.log('----> authorization to:', to);

  const filter = [
    ...createQueryFilterClauses(filterQuery as FilterQuery),
    { term: { 'event.category': 'user-login' } },
    { term: { 'process.exe': '/usr/sbin/sshd' } },
    { terms: { 'event.type': ['user_login', 'user_start'] } },
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
    user_count: {
      cardinality: {
        field: 'auditd.data.acct',
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
        users: {
          terms: {
            field: 'auditd.data.acct',
            order: { 'failures.doc_count': 'desc' },
          },
          aggregations: {
            failures: {
              filter: {
                term: {
                  'auditd.result': 'fail',
                },
              },
            },
            login_result: {
              terms: {
                field: 'auditd.result',
              },
              aggregations: {
                success_failure: {
                  top_hits: {
                    size: 1,
                    _source: ['@timestamp', 'source.ip'], // TODO: Make this like esFields from hosts
                    sort: [{ '@timestamp': { order: 'desc' } }],
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

  if (cursor) {
    return merge(dslQuery, {
      body: {
        aggregations: {
          group_by_host: {
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
