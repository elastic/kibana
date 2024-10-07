/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SyntheticsEsClient } from '../../lib';

export async function queryMonitorHeatmap({
  syntheticsEsClient,
  from,
  to,
  monitorId,
  location,
  intervalInMinutes,
}: {
  syntheticsEsClient: SyntheticsEsClient;
  from: number | string;
  to: number | string;
  monitorId: string;
  location: string;
  intervalInMinutes: number;
}) {
  return syntheticsEsClient.search({
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
                  gte: from,
                  lte: to,
                },
              },
            },
            {
              term: {
                'monitor.id': monitorId,
              },
            },
            {
              term: {
                'observer.geo.name': location,
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
      _source: false,
      fields: ['@timestamp', 'config_id', 'summary.*', 'error.*', 'observer.geo.name'],
      aggs: {
        heatmap: {
          date_histogram: {
            field: '@timestamp',
            fixed_interval: `${intervalInMinutes}m`,
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
