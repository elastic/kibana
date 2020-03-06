/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { createQueryFilterClauses } from '../../utils/build_query';
import { KpiHostsESMSearchBody } from './types';
import { RequestBasicOptions } from '../framework';

export const buildAuthQuery = ({
  filterQuery,
  timerange: { from, to },
  defaultIndex,
  sourceConfiguration: {
    fields: { timestamp },
  },
}: RequestBasicOptions): KpiHostsESMSearchBody[] => {
  const filter = [
    ...createQueryFilterClauses(filterQuery),
    {
      bool: {
        filter: [
          {
            term: {
              'event.category': 'authentication',
            },
          },
        ],
      },
    },
    {
      range: {
        [timestamp]: {
          gte: from,
          lte: to,
        },
      },
    },
  ];

  const dslQuery = [
    {
      index: defaultIndex,
      allowNoIndices: true,
      ignoreUnavailable: true,
    },
    {
      aggs: {
        authentication_success: {
          filter: {
            term: {
              'event.type': 'authentication_success',
            },
          },
        },
        authentication_success_histogram: {
          auto_date_histogram: {
            field: '@timestamp',
            buckets: '6',
          },
          aggs: {
            count: {
              filter: {
                term: {
                  'event.type': 'authentication_success',
                },
              },
            },
          },
        },
        authentication_failure: {
          filter: {
            term: {
              'event.type': 'authentication_failure',
            },
          },
        },
        authentication_failure_histogram: {
          auto_date_histogram: {
            field: '@timestamp',
            buckets: '6',
          },
          aggs: {
            count: {
              filter: {
                term: {
                  'event.type': 'authentication_failure',
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
      track_total_hits: false,
    },
  ];
  return dslQuery;
};
