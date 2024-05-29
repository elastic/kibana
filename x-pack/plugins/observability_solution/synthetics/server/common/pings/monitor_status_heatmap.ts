/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UptimeEsClient } from '../../lib';

export async function queryMonitorHeatmap({
  uptimeEsClient,
  from,
  to,
  monitorId,
  location,
  interval,
}: {
  uptimeEsClient: UptimeEsClient;
  from: number | string;
  to: number | string;
  monitorId: string;
  location: string;
  interval: number;
}) {
  return uptimeEsClient.search({
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            {
              exists: {
                field: 'summary',
              },
            },
            {
              range: {
                '@timestamp': {
                  // @ts-expect-error strings work
                  gte: from,
                  // @ts-expect-error strings work
                  lte: to,
                },
              },
            },
            {
              term: {
                'monitor.id': monitorId,
              },
            },
          ],
        },
      },
      sort: [
        {
          '@timestamp': {
            order: 'desc',
          },
        },
      ],
      post_filter: {
        terms: {
          'observer.geo.name': [location],
        },
      },
      _source: false,
      fields: ['@timestamp', 'config_id', 'summary.*', 'error.*', 'observer.geo.name'],
      aggs: {
        heatmap: {
          date_histogram: {
            field: '@timestamp',
            fixed_interval: `${interval}m`,
          },
          aggs: {
            up: {
              sum: {
                field: 'summary.up',
              },
            },
            down: {
              sum: {
                field: 'summary.down',
              },
            },
          },
        },
      },
    },
  });
}
