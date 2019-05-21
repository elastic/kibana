/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { createQueryFilterClauses } from '../../utils/build_query';
import { RequestBasicOptions } from '../framework';

import { KpiNetworkESMSearchBody, UniquePrivateAttributeQuery } from './types';

const getUniquePrivateIpsFilter = (attrQuery: UniquePrivateAttributeQuery) => [
  {
    bool: {
      should: [
        {
          bool: {
            should: [
              {
                match: {
                  [`${attrQuery}.ip`]: '10.0.0.0/8',
                },
              },
            ],
            minimum_should_match: 1,
          },
        },
        {
          bool: {
            should: [
              {
                bool: {
                  should: [
                    {
                      match: {
                        [`${attrQuery}.ip`]: '192.168.0.0/16',
                      },
                    },
                  ],
                  minimum_should_match: 1,
                },
              },
              {
                bool: {
                  should: [
                    {
                      bool: {
                        should: [
                          {
                            match: {
                              [`${attrQuery}.ip`]: '172.16.0.0/12',
                            },
                          },
                        ],
                        minimum_should_match: 1,
                      },
                    },
                    {
                      bool: {
                        should: [
                          {
                            match_phrase: {
                              [`${attrQuery}.ip`]: 'fd00::/8',
                            },
                          },
                        ],
                        minimum_should_match: 1,
                      },
                    },
                  ],
                  minimum_should_match: 1,
                },
              },
            ],
            minimum_should_match: 1,
          },
        },
      ],
      minimum_should_match: 1,
    },
  },
];

export const buildUniquePrvateIpQuery = (
  attrQuery: UniquePrivateAttributeQuery,
  {
    filterQuery,
    timerange: { from, to },
    sourceConfiguration: {
      fields: { timestamp },
      logAlias,
      packetbeatAlias,
    },
  }: RequestBasicOptions
): KpiNetworkESMSearchBody[] => {
  const filter = [
    ...createQueryFilterClauses(filterQuery),
    ...getUniquePrivateIpsFilter(attrQuery),
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
      allowNoIndices: true,
      index: [logAlias, packetbeatAlias],
      ignoreUnavailable: true,
    },
    {
      aggregations: {
        unique_private_ips: {
          cardinality: {
            field: `${attrQuery}.ip`,
          },
        },
      },
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
