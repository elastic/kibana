/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { merge } from 'lodash/fp';
import { createQueryFilterClauses } from '../../utils/build_query';
import { reduceFields } from '../../utils/build_query/reduce_fields';
import { hostFieldsMap } from '../ecs_fields';
import { RequestOptions } from '../framework';

export const hostsFieldsMap: Readonly<Record<string, string>> = {
  firstSeen: '@timestamp',
  ...{ ...hostFieldsMap },
};

export const buildQuery = ({
  fields,
  filterQuery,
  timerange: { from, to },
  pagination: { limit, cursor },
  sourceConfiguration: {
    fields: { timestamp },
    auditbeatAlias,
  },
}: RequestOptions) => {
  const esFields = reduceFields(fields, hostsFieldsMap);

  const filter = [
    ...createQueryFilterClauses(filterQuery),
    { term: { 'event.module': 'system' } },
    { term: { 'event.dataset': 'host' } },
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
    index: auditbeatAlias,
    ignoreUnavailable: true,
    body: {
      aggregations: {
        ...agg,
        group_by_host: {
          composite: {
            size: limit + 1,
            sources: [{ host_name: { terms: { field: 'host.id' } } }],
          },
          aggs: {
            time: {
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
                    '@timestamp': { order: 'asc' },
                    'host.name': { order: 'asc' },
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
