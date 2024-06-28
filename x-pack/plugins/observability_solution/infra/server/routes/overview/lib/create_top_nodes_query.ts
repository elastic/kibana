/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MetricsSourceConfiguration } from '../../../../common/metrics_sources';
import { TopNodesRequest } from '../../../../common/http_api/overview_api';
import { TIMESTAMP_FIELD } from '../../../../common/constants';

export const createTopNodesQuery = (
  options: TopNodesRequest,
  source: MetricsSourceConfiguration
) => {
  const nestedSearchFields: { [key: string]: string } = {
    rx: 'rx>bytes',
    tx: 'tx>bytes',
  };
  const sortByHost = options.sort && options.sort === 'name';
  const metricsSortField = options.sort
    ? nestedSearchFields[options.sort] || options.sort
    : 'uptime';
  const sortField = sortByHost ? '_key' : metricsSortField;
  const sortDirection = options.sortDirection ?? 'asc';
  return {
    runtime_mappings: {
      rx_bytes_per_period: {
        type: 'double',
        script: {
          source: `
          if(doc[\'host.network.ingress.bytes\'].size() !=0)
          {
            emit((doc[\'host.network.ingress.bytes\'].value/(doc[\'metricset.period\'].value / 1000)));
          }
            `,
        },
      },
      tx_bytes_per_period: {
        type: 'double',
        script: {
          source: `
            if(doc[\'host.network.egress.bytes\'].size() !=0)
          {
            emit((doc[\'host.network.egress.bytes\'].value/(doc[\'metricset.period\'].value / 1000)));
          }
            `,
        },
      },
    },
    size: 0,
    query: {
      bool: {
        filter: [
          {
            range: {
              [TIMESTAMP_FIELD]: {
                gte: options.timerange.from,
                lte: options.timerange.to,
                format: 'epoch_millis',
              },
            },
          },
          {
            match_phrase: { 'event.module': 'system' },
          },
        ],
      },
    },
    aggs: {
      nodes: {
        terms: {
          field: 'host.name',
          size: options.size,
          order: { [sortField]: sortDirection },
        },
        aggs: {
          metadata: {
            top_metrics: {
              metrics: [
                { field: 'host.os.platform' },
                { field: 'host.name' },
                { field: 'cloud.provider' },
              ],
              sort: { [TIMESTAMP_FIELD]: 'desc' },
              size: 1,
            },
          },
          uptime: {
            max: {
              field: 'system.uptime.duration.ms',
            },
          },
          cpu: {
            avg: {
              field: 'system.cpu.total.norm.pct',
            },
          },
          iowait: {
            avg: {
              field: 'system.core.iowait.pct',
            },
          },
          load: {
            avg: {
              field: 'system.load.15',
            },
          },
          rx: {
            filter: {
              exists: {
                field: 'host.network.ingress.bytes',
              },
            },
            aggs: {
              bytes: {
                avg: {
                  field: 'rx_bytes_per_period',
                },
              },
            },
          },
          tx: {
            filter: {
              exists: {
                field: 'host.network.egress.bytes',
              },
            },
            aggs: {
              bytes: {
                avg: {
                  field: 'tx_bytes_per_period',
                },
              },
            },
          },
          timeseries: {
            date_histogram: {
              field: '@timestamp',
              fixed_interval: options.bucketSize,
              extended_bounds: {
                min: options.timerange.from,
                max: options.timerange.to,
              },
            },
            aggs: {
              cpu: {
                avg: {
                  field: 'host.cpu.pct',
                },
              },
              iowait: {
                avg: {
                  field: 'system.core.iowait.pct',
                },
              },
              load: {
                avg: {
                  field: 'system.load.15',
                },
              },
              rx: {
                filter: {
                  exists: {
                    field: 'host.network.ingress.bytes',
                  },
                },
                aggs: {
                  bytes: {
                    avg: {
                      field: 'rx_bytes_per_period',
                    },
                  },
                },
              },
              tx: {
                filter: {
                  exists: {
                    field: 'host.network.egress.bytes',
                  },
                },
                aggs: {
                  bytes: {
                    avg: {
                      field: 'tx_bytes_per_period',
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  };
};
