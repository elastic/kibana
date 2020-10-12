/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash/fp';

import { HostAuthenticationsRequestOptions } from '../../../../../../../common/search_strategy/security_solution/hosts/authentications';
import { sourceFieldsMap, hostFieldsMap } from '../../../../../../../common/ecs/ecs_fields';

import { createQueryFilterClauses } from '../../../../../../utils/build_query';
import { reduceFields } from '../../../../../../utils/build_query/reduce_fields';

import { authenticationsFields } from '../helpers';
import { extendMap } from '../../../../../../../common/ecs/ecs_fields/extend_map';

export const auditdFieldsMap: Readonly<Record<string, string>> = {
  latest: '@timestamp',
  'lastSuccess.timestamp': 'lastSuccess.@timestamp',
  'lastFailure.timestamp': 'lastFailure.@timestamp',
  ...{ ...extendMap('lastSuccess', sourceFieldsMap) },
  ...{ ...extendMap('lastSuccess', hostFieldsMap) },
  ...{ ...extendMap('lastFailure', sourceFieldsMap) },
  ...{ ...extendMap('lastFailure', hostFieldsMap) },
};

export const buildQuery = ({
  filterQuery,
  timerange: { from, to },
  pagination: { querySize },
  defaultIndex,
  docValueFields,
}: HostAuthenticationsRequestOptions) => {
  const esFields = reduceFields(authenticationsFields, { ...hostFieldsMap, ...sourceFieldsMap });

  const filter = [
    ...createQueryFilterClauses(filterQuery),
    { term: { 'event.category': 'authentication' } },
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

  const agg = {
    user_count: {
      cardinality: {
        field: 'user.name',
      },
    },
  };

  const dslQuery = {
    allowNoIndices: true,
    index: defaultIndex,
    ignoreUnavailable: true,
    body: {
      ...(isEmpty(docValueFields) ? { docvalue_fields: docValueFields } : {}),
      aggregations: {
        ...agg,
        group_by_users: {
          terms: {
            size: querySize,
            field: 'user.name',
            order: [{ 'successes.doc_count': 'desc' }, { 'failures.doc_count': 'desc' }],
          },
          aggs: {
            failures: {
              filter: {
                term: {
                  'event.outcome': 'failure',
                },
              },
              aggs: {
                lastFailure: {
                  top_hits: {
                    size: 1,
                    _source: esFields,
                    sort: [{ '@timestamp': { order: 'desc' } }],
                  },
                },
              },
            },
            successes: {
              filter: {
                term: {
                  'event.outcome': 'success',
                },
              },
              aggs: {
                lastSuccess: {
                  top_hits: {
                    size: 1,
                    _source: esFields,
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
      size: 0,
    },
    track_total_hits: false,
  };

  return dslQuery;
};
