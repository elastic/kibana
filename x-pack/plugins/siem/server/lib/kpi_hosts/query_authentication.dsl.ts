/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { createQueryFilterClauses } from '../../utils/build_query';
import { RequestBasicOptions } from '../framework';

import { KpiHostsESMSearchBody } from './types';

const getAuthQueryFilter = () => [
  {
    bool: {
      should: [
        {
          match: {
            'event.type': 'authentication_success',
          },
        },
        {
          match: {
            'event.type': 'authentication_failure',
          },
        },
      ],
      minimum_should_match: 1,
    },
  },
];

export const buildAuthQuery = ({
  filterQuery,
  timerange: { from, to },
  sourceConfiguration: {
    fields: { timestamp },
    logAlias,
    auditbeatAlias,
    packetbeatAlias,
    winlogbeatAlias,
  },
}: RequestBasicOptions): KpiHostsESMSearchBody[] => {
  const filter = [
    ...createQueryFilterClauses(filterQuery),
    ...getAuthQueryFilter(),
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
      index: [logAlias, auditbeatAlias, packetbeatAlias, winlogbeatAlias],
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
