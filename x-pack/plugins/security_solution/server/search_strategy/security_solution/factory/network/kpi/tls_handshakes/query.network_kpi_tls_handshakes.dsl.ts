/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NetworkKpiTlsHandshakesRequestOptions } from '../../../../../../../common/search_strategy/security_solution/network';
import { createQueryFilterClauses } from '../../../../../../utils/build_query';
import { getIpFilter } from '../common';

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
}: NetworkKpiTlsHandshakesRequestOptions) => {
  const filter = [
    ...getIpFilter(),
    ...createQueryFilterClauses(filterQuery),
    ...getTlsHandshakesQueryFilter(),
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

  const dslQuery = {
    index: defaultIndex,
    allow_no_indices: true,
    ignore_unavailable: true,
    track_total_hits: true,
    body: {
      query: {
        bool: {
          filter,
        },
      },
      size: 0,
    },
  };

  return dslQuery;
};
