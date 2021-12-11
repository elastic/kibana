/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import { NetworkDetailsRequestOptions } from '../../../../../../common/search_strategy/security_solution/network';

const getAggs = (type: string, ip: string) => {
  return {
    [type]: {
      filter: {
        term: {
          [`${type}.ip`]: ip,
        },
      },
      aggs: {
        firstSeen: {
          min: {
            field: '@timestamp',
          },
        },
        lastSeen: {
          max: {
            field: '@timestamp',
          },
        },
        as: {
          filter: {
            exists: {
              field: `${type}.as`,
            },
          },
          aggs: {
            results: {
              top_hits: {
                size: 1,
                _source: [`${type}.as`],
                sort: [
                  {
                    '@timestamp': 'desc' as const,
                  },
                ],
              },
            },
          },
        },
        geo: {
          filter: {
            exists: {
              field: `${type}.geo`,
            },
          },
          aggs: {
            results: {
              top_hits: {
                size: 1,
                _source: [`${type}.geo`],
                sort: [
                  {
                    '@timestamp': 'desc' as const,
                  },
                ],
              },
            },
          },
        },
      },
    },
  };
};

const getHostAggs = (ip: string) => {
  return {
    host: {
      filter: {
        term: {
          'host.ip': ip,
        },
      },
      aggs: {
        results: {
          top_hits: {
            size: 1,
            _source: ['host'],
            sort: [
              {
                '@timestamp': 'desc' as const,
              },
            ],
          },
        },
      },
    },
  };
};

export const buildNetworkDetailsQuery = ({
  defaultIndex,
  docValueFields,
  ip,
}: NetworkDetailsRequestOptions) => {
  const dslQuery = {
    allow_no_indices: true,
    index: defaultIndex,
    ignore_unavailable: true,
    track_total_hits: false,
    body: {
      ...(!isEmpty(docValueFields) ? { docvalue_fields: docValueFields } : {}),
      aggs: {
        ...getAggs('source', ip),
        ...getAggs('destination', ip),
        ...getHostAggs(ip),
      },
      query: {
        bool: {
          should: [],
        },
      },
      size: 0,
    },
  };

  return dslQuery;
};
