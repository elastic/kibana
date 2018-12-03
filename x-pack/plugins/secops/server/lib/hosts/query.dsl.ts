/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createQueryFilterClauses } from '../../utils/build_query';
import { FilterQuery } from '../types';
import { HostsRequestOptions } from './types';

export const HostsFieldsMap = {
  firstSeen: '@timestamp',
  name: 'host.name',
  os: 'system.host.os.name',
  version: 'system.host.os.version',
};

export const buildQuery = (options: HostsRequestOptions) => {
  const { to, from } = options.timerange;
  const { page, size } = options.pagination;
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
        field: 'host.name',
      },
    },
  };

  return {
    allowNoIndices: true,
    index: options.sourceConfiguration.auditbeatAlias,
    ignoreUnavailable: true,
    body: {
      aggregations: agg,
      query: {
        bool: {
          filter,
        },
      },
      collapse: {
        field: 'host.name',
      },
      sort: [
        {
          [options.sourceConfiguration.fields.timestamp]: 'desc',
        },
      ],
      _source: EsFields,
      size,
      from: page,
    },
  };
};
