/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InfraSource } from '../../../../common/http_api/source_api';
import { TopNodesRequest } from '../../../../common/http_api/overview_api';

export const createTopNodesQuery = (options: TopNodesRequest, source: InfraSource) => ({
  size: 0,
  query: {
    bool: {
      filter: [
        {
          range: {
            [source.configuration.fields.timestamp]: {
              gte: options.timerange.from,
              lte: options.timerange.to,
            },
          },
        },
      ],
    },
  },
  aggs: {
    nodes: {
      terms: {
        field: 'host.id',
        size: options.size,
      },
      aggs: {
        metadata: {
          top_metrics: {
            metrics: [
              { field: 'host.os.platform' },
              { field: 'host.name' },
              { field: 'cloud.provider' },
            ],
            sort: { '@timestamp': 'desc' },
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
        disk_usage: {
          avg: {
            field: 'system.filesystem.used.pct',
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
            disk_usage: {
              avg: {
                field: 'system.filesystem.used.pct',
              },
            },
          },
        },
      },
    },
  },
});
