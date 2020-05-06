/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IpOverviewRequestOptions } from './index';

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
                    '@timestamp': 'desc',
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
                    '@timestamp': 'desc',
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
                '@timestamp': 'desc',
              },
            ],
          },
        },
      },
    },
  };
};

export const buildOverviewQuery = ({ defaultIndex, ip }: IpOverviewRequestOptions) => {
  const dslQuery = {
    allowNoIndices: true,
    index: defaultIndex,
    ignoreUnavailable: true,
    body: {
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
      track_total_hits: false,
    },
  };
  return dslQuery;
};
