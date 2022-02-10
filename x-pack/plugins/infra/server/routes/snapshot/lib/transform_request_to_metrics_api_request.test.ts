/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformRequestToMetricsAPIRequest } from './transform_request_to_metrics_api_request';
import { ESSearchClient } from '../../../lib/metrics/types';
import { InfraSource } from '../../../lib/sources';
import { SnapshotRequest } from '../../../../common/http_api';

jest.mock('./create_timerange_with_interval', () => {
  return {
    createTimeRangeWithInterval: () => ({
      interval: '60s',
      from: 1605705900000,
      to: 1605706200000,
    }),
  };
});

describe('transformRequestToMetricsAPIRequest', () => {
  test('returns a MetricsApiRequest given parameters', async () => {
    const compositeSize = 3000;
    const result = await transformRequestToMetricsAPIRequest({
      client: {} as ESSearchClient,
      source,
      snapshotRequest,
      compositeSize,
    });
    expect(result).toEqual(metricsApiRequest);
  });
});

const source: InfraSource = {
  id: 'default',
  version: 'WzkzNjk5LDVd',
  updatedAt: 1617384456384,
  origin: 'stored',
  configuration: {
    name: 'Default',
    description: '',
    metricAlias: 'metrics-*,metricbeat-*',
    logIndices: {
      type: 'index_pattern',
      indexPatternId: 'kibana_index_pattern',
    },
    fields: {
      message: ['message', '@message'],
    },
    inventoryDefaultView: '0',
    metricsExplorerDefaultView: '0',
    logColumns: [
      { timestampColumn: { id: '5e7f964a-be8a-40d8-88d2-fbcfbdca0e2f' } },
      { fieldColumn: { id: ' eb9777a8-fcd3-420e-ba7d-172fff6da7a2', field: 'event.dataset' } },
      { messageColumn: { id: 'b645d6da-824b-4723-9a2a-e8cece1645c0' } },
      { fieldColumn: { id: '906175e0-a293-42b2-929f-87a203e6fbec', field: 'agent.name' } },
    ],
    anomalyThreshold: 50,
  },
};

const snapshotRequest: SnapshotRequest = {
  metrics: [{ type: 'cpu' }],
  groupBy: [],
  nodeType: 'pod',
  timerange: { interval: '1m', to: 1605706200000, from: 1605705000000, lookbackSize: 5 },
  filterQuery: '',
  sourceId: 'default',
  accountId: '',
  region: '',
  includeTimeseries: true,
};

const metricsApiRequest = {
  indexPattern: 'metrics-*,metricbeat-*',
  timerange: { from: 1605705900000, to: 1605706200000, interval: '60s' },
  metrics: [
    {
      id: 'cpu',
      aggregations: {
        cpu_with_limit: { avg: { field: 'kubernetes.pod.cpu.usage.limit.pct' } },
        cpu_without_limit: { avg: { field: 'kubernetes.pod.cpu.usage.node.pct' } },
        cpu: {
          bucket_script: {
            buckets_path: { with_limit: 'cpu_with_limit', without_limit: 'cpu_without_limit' },
            script: {
              source: 'params.with_limit > 0.0 ? params.with_limit : params.without_limit',
              lang: 'painless',
            },
            gap_policy: 'skip',
          },
        },
      },
    },
    {
      id: '__metadata__',
      aggregations: {
        __metadata__: {
          top_metrics: {
            metrics: [{ field: 'kubernetes.pod.name' }, { field: 'kubernetes.pod.ip' }],
            size: 1,
            sort: { '@timestamp': 'desc' },
          },
        },
      },
    },
  ],
  limit: 3000,
  alignDataToEnd: true,
  dropPartialBuckets: true,
  groupBy: ['kubernetes.pod.uid'],
};
