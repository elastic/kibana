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
  const sortByHost = options.sort && options.sort === 'name';
  const sortField = sortByHost ? '_key' : options.sort ?? 'uptime';
  const sortDirection = options.sortDirection ?? 'asc';
  return {
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
            sum: {
              field: 'host.network.in.bytes',
            },
          },
          tx: {
            sum: {
              field: 'host.network.out.bytes',
            },
          },
          timeseries: {
            date_histogram: {
              field: '@timestamp',
              fixed_interval: '1m',
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
                rate: {
                  field: 'host.network.ingress.bytes',
                },
              },
              tx: {
                rate: {
                  field: 'host.network.egress.bytes',
                },
              },
            },
          },
        },
      },
    },
  };
};
