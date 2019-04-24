/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { createQueryFilterClauses } from '../../utils/build_query';
import { RequestBasicOptions } from '../framework';

import { KpiHostsESMSearchBody } from './types';

export const buildGeneralQuery = ({
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
      aggregations: {
        hosts: {
          cardinality: {
            field: 'host.name',
          },
        },
        hosts_hostogram: {
          filter: {
            bool: {
              should: [
                {
                  exists: {
                    field: 'host.name'
                  }
                }
              ],
              minimum_should_match: 1
            }
          },
          aggregations: {
            hosts_over_time: {
              auto_date_histogram: {
                field: '@timestamp',
                buckets: '6'
              },  
            },
          },
        },
        unique_source_ips: {
          cardinality: {
            field: 'source.ip',
          },
        },
        unique_source_ips_hostogram: {
          filter: {
            bool: {
              should: [
                {
                  exists: {
                    field: 'source.ip'
                  }
                }
              ],
              minimum_should_match: 1
            }
          },
          aggregations: {
            ips_over_time: {
              auto_date_histogram: {
                field: '@timestamp',
                buckets: 6
              },  
            },
          },
        },
        unique_destination_ips: {
          cardinality: {
            field: 'destination.ip',
          },
        },
        unique_destination_ips_hostogram: {
          filter: {
            bool: {
              should: [
                {
                  exists: {
                    field: 'destination.ip'
                  }
                }
              ],
              minimum_should_match: 1
            }
          },
          aggregations: {
            ips_over_time: {
              auto_date_histogram: {
                field: '@timestamp',
                buckets: 6
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
