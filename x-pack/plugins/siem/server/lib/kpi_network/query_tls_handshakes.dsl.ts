/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { createQueryFilterClauses } from '../../utils/build_query';
import { RequestBasicOptions } from '../framework';

import { KpiNetworkESMSearchBody } from './types';
import { getIpFilter } from './helpers';

const getTlsHandshakesQueryFilter = () => [
  {
    bool: {
      should: [
        {
          exists: {
            field: 'tls.version',
          },
        },
        {
          exists: {
            field: 'suricata.eve.tls.version',
          },
        },
        {
          exists: {
            field: 'zeek.ssl.version',
          },
        },
      ],
      minimum_should_match: 1,
    },
  },
];

export const buildTlsHandshakeQuery = ({
  filterQuery,
  timerange: { from, to },
  defaultIndex,
  sourceConfiguration: {
    fields: { timestamp },
  },
}: RequestBasicOptions): KpiNetworkESMSearchBody[] => {
  const filter = [
    ...getIpFilter(),
    ...createQueryFilterClauses(filterQuery),
    ...getTlsHandshakesQueryFilter(),
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
