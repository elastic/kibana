/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fetchESUsage } from './fetch_es_usage';

describe('fetchESUsage', () => {
  const clusterUuid = '1abcde2';
  const index = '.monitoring-es-*';
  const callCluster = jest.fn().mockImplementation(() => ({
    hits: {
      hits: [
        {
          _source: {
            cluster_stats: {
              nodes: {
                count: {
                  total: 10,
                },
              },
            },
          },
        },
      ],
    },
    aggregations: {
      indices: {
        buckets: [
          {
            key: '.monitoring-es-2',
          },
        ],
      },
    },
  }));
  const config: any = {};

  it('should return usage data for Elasticsearch', async () => {
    const result = await fetchESUsage(config, callCluster, clusterUuid, index);
    expect(result).toStrictEqual({
      count: 10,
      enabled: true,
      metricbeatUsed: false,
    });
  });

  it('should handle some indices coming from Metricbeat', async () => {
    const customCallCluster = jest.fn().mockImplementation(() => ({
      hits: {
        hits: [
          {
            _source: {
              cluster_stats: {
                nodes: {
                  count: {
                    total: 10,
                  },
                },
              },
            },
          },
        ],
      },
      aggregations: {
        indices: {
          buckets: [
            {
              key: '.monitoring-es-mb-2',
            },
          ],
        },
      },
    }));
    const result = await fetchESUsage(config, customCallCluster, clusterUuid, index);
    expect(result).toStrictEqual({
      count: 10,
      enabled: true,
      metricbeatUsed: true,
    });
  });

  it('should handle no monitoring data', async () => {
    const customCallCluster = jest.fn().mockImplementation(() => ({
      hits: {
        hits: [],
      },
    }));
    const result = await fetchESUsage(config, customCallCluster, clusterUuid, index);
    expect(result).toStrictEqual({
      count: 0,
      enabled: false,
      metricbeatUsed: false,
    });
  });
});
