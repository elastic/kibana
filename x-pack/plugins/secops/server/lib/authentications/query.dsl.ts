/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { merge } from 'lodash/fp';
import { createQueryFilterClauses } from '../../utils/build_query';
import { reduceFields } from '../../utils/build_query/reduce_fields';
import { hostFieldsMap, sourceFieldsMap } from '../ecs_fields';
import { RequestOptions } from '../framework';
import { FilterQuery } from '../types';

export const auditdFieldsMap: Readonly<Record<string, string>> = {
  latest: '@timestamp',
  ...{ ...sourceFieldsMap },
  ...{ ...hostFieldsMap },
};

export const buildQuery = (options: RequestOptions) => {
  const { to, from } = options.timerange;
  const { limit, cursor } = options.pagination;
  const { fields, filterQuery } = options;
  const esFields = reduceFields(fields, auditdFieldsMap);

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
        group_by_users: {
          composite: {
            size: limit + 1,
            sources: [{ user_uid: { terms: { field: 'auditd.data.acct' } } }],
          },
          aggs: {
            failures: {
              filter: {
                term: {
                  'auditd.result': 'fail',
                },
              },
            },
            successes: {
              filter: {
                term: {
                  'auditd.result': 'success',
                },
              },
            },
            authentication: {
              top_hits: {
                size: 1,
                _source: esFields,
                sort: [{ '@timestamp': { order: 'desc' } }],
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
          group_by_users: {
            composite: {
              after: {
                user_uid: cursor,
              },
            },
          },
        },
      },
    });
  }
  return dslQuery;
};
