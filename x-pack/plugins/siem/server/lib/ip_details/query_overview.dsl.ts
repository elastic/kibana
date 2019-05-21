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
        autonomous_system: {
          filter: {
            exists: {
              field: 'autonomous_system',
            },
          },
          aggs: {
            results: {
              top_hits: {
                size: 1,
                _source: ['autonomous_system'],
                sort: [
                  {
                    '@timestamp': 'desc',
                  },
                ],
              },
            },
          },
        },
        host: {
          filter: {
            exists: {
              field: 'host',
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

export const buildOverviewQuery = ({
  filterQuery,
  sourceConfiguration: {
    fields: { timestamp },
    logAlias,
    packetbeatAlias,
  },
  ip,
}: IpOverviewRequestOptions) => {
  const dslQuery = {
    allowNoIndices: true,
    index: [logAlias, packetbeatAlias],
    ignoreUnavailable: true,
    body: {
      aggs: {
        ...getAggs('source', ip),
        ...getAggs('destination', ip),
      },
      query: {
        bool: {
          should: [],
        },
      },
      size: 0,
      track_total_hits: true,
    },
  };

  return dslQuery;
};
