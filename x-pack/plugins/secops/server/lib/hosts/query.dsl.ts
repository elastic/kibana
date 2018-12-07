/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { merge } from 'lodash/fp';
import { createQueryFilterClauses } from '../../utils/build_query';
import { FilterQuery } from '../types';
import { HostsRequestOptions } from './types';

export const HostsFieldsMap = {
  firstSeen: '@timestamp',
  name: 'system.host.name',
  os: 'system.host.os.name',
  version: 'system.host.os.version',
};

export const buildQuery = (options: HostsRequestOptions) => {
  const { to, from } = options.timerange;
  const { limit, cursor } = options.pagination;
  const Fields = options.fields;
  const filterQuery = options.filterQuery;
  const EsFields = Fields.reduce(
    (res, f: string) => {
      if (HostsFieldsMap.hasOwnProperty(f)) {
        const esField = Object.getOwnPropertyDescriptor(HostsFieldsMap, f);
        if (esField && esField.value) {
          res = [...res, esField.value];
        }
      }
      return res;
    },
    [] as string[]
  );

  const filter = [
    ...createQueryFilterClauses(filterQuery as FilterQuery),
    { term: { 'event.module': 'system' } },
    { term: { 'event.dataset': 'host' } },
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
    host_count: {
      cardinality: {
        field: 'system.host.id',
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
        group_by_host: {
          composite: {
            size: limit + 1,
            sources: [{ host_name: { terms: { field: 'system.host.id' } } }],
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
                _source: EsFields,
                sort: [
                  {
                    '@timestamp': { order: 'asc' },
                    'system.host.name': { order: 'asc' },
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
