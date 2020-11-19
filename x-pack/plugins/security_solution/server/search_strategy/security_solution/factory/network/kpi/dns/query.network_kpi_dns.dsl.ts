/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { NetworkKpiDnsRequestOptions } from '../../../../../../../common/search_strategy/security_solution/network';
import { createQueryFilterClauses } from '../../../../../../utils/build_query';

const getDnsQueryFilter = () => [
  {
    bool: {
      should: [
        {
          exists: {
            field: 'dns.question.name',
          },
        },
        {
          term: {
            'suricata.eve.dns.type': {
              value: 'query',
            },
          },
        },
        {
          exists: {
            field: 'zeek.dns.query',
          },
        },
      ],
      minimum_should_match: 1,
    },
  },
];

export const buildDnsQuery = ({
  filterQuery,
  timerange: { from, to },
  defaultIndex,
}: NetworkKpiDnsRequestOptions) => {
  const filter = [
    ...createQueryFilterClauses(filterQuery),
    ...getDnsQueryFilter(),
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
    allowNoIndices: true,
    ignoreUnavailable: true,
    body: {
      query: {
        bool: {
          filter,
        },
      },
      size: 0,
      track_total_hits: true,
    },
  };

  return dslQuery;
};
