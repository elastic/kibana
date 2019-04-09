/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { createQueryFilterClauses } from '../../utils/build_query';
import { RequestBasicOptions } from '../framework';

import { KpiHostsESMSearchBody } from './types';

const getProcessQueryFilter = () => [
  {
    bool: {
      should: [
        {
          match: {
            'event.action': 'process_started',
          },
        },
        {
          match: {
            'event.action': 'executed',
          },
        },
        {
          match: {
            'event.code': 4688,
          },
        },
      ],
      minimum_should_match: 1,
    },
  },
];

export const buildProcessQuery = ({
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
    ...getProcessQueryFilter(),
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
      index: [logAlias, packetbeatAlias, packetbeatAlias, winlogbeatAlias],
      allowNoIndices: true,
      ignoreUnavailable: true,
    },
    {
      query: {
        bool: {
          filter,
        },
      },
      size: 0,
      track_total_hits: true,
    },
  ];

  return dslQuery;
};
