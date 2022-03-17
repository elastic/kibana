/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getMonitoringUsageCollector } from './get_usage_collector';
import { fetchClusters } from '../../lib/alerts/fetch_clusters';
import { elasticsearchServiceMock } from '../../../../../../src/core/server/mocks';
import { MonitoringConfig } from '../../config';

jest.mock('../../lib/alerts/fetch_clusters', () => ({
  fetchClusters: jest.fn().mockImplementation(() => {
    return [
      {
        clusterUuid: '1abc',
        clusterName: 'unitTesting',
      },
    ];
  }),
}));

jest.mock('./lib/get_stack_products_usage', () => ({
  getStackProductsUsage: jest.fn().mockImplementation(() => {
    return {
      elasticsearch: {
        count: 5,
        enabled: true,
        metricbeatUsed: true,
      },
      kibana: {
        count: 2,
        enabled: true,
        metricbeatUsed: false,
      },
      logstash: {
        count: 0,
        enabled: false,
        metricbeatUsed: false,
      },
      beats: {
        count: 1,
        enabled: true,
        metricbeatUsed: false,
      },
      apm: {
        count: 1,
        enabled: true,
        metricbeatUsed: true,
      },
    };
  }),
}));

jest.mock('./lib/fetch_license_type', () => ({
  fetchLicenseType: jest.fn().mockImplementation(() => {
    return 'trial';
  }),
}));

describe('getMonitoringUsageCollector', () => {
  const esClient = elasticsearchServiceMock.createClusterClient();
  const getEsClient = () => esClient;
  const config = {
    ui: {
      ccs: {
        enabled: true,
      },
    },
  } as MonitoringConfig;

  it('should be configured correctly', async () => {
    const usageCollection: any = {
      makeUsageCollector: jest.fn(),
    };
    getMonitoringUsageCollector(usageCollection, config, getEsClient);

    const mock = (usageCollection.makeUsageCollector as jest.Mock).mock;

    const args = mock.calls[0];
    expect(args[0].type).toBe('monitoring');
    expect(typeof args[0].isReady).toBe('function');
    expect(args[0].schema).toStrictEqual({
      hasMonitoringData: { type: 'boolean' },
      clusters: {
        type: 'array',
        items: {
          license: { type: 'keyword' },
          clusterUuid: { type: 'keyword' },
          metricbeatUsed: { type: 'boolean' },
          elasticsearch: {
            enabled: { type: 'boolean' },
            count: { type: 'long' },
            metricbeatUsed: { type: 'boolean' },
          },
          kibana: {
            enabled: { type: 'boolean' },
            count: { type: 'long' },
            metricbeatUsed: { type: 'boolean' },
          },
          logstash: {
            enabled: { type: 'boolean' },
            count: { type: 'long' },
            metricbeatUsed: { type: 'boolean' },
          },
          beats: {
            enabled: { type: 'boolean' },
            count: { type: 'long' },
            metricbeatUsed: { type: 'boolean' },
          },
          apm: {
            enabled: { type: 'boolean' },
            count: { type: 'long' },
            metricbeatUsed: { type: 'boolean' },
          },
        },
      },
    });
  });

  it('should fetch usage data', async () => {
    const usageCollection: any = {
      makeUsageCollector: jest.fn(),
    };

    getMonitoringUsageCollector(usageCollection, config, getEsClient);
    const mock = (usageCollection.makeUsageCollector as jest.Mock).mock;
    const args = mock.calls[0];

    const result = await args[0].fetch({});
    expect(result).toStrictEqual({
      hasMonitoringData: true,
      clusters: [
        {
          clusterUuid: '1abc',
          license: 'trial',
          elasticsearch: { count: 5, enabled: true, metricbeatUsed: true },
          kibana: { count: 2, enabled: true, metricbeatUsed: false },
          logstash: { count: 0, enabled: false, metricbeatUsed: false },
          beats: { count: 1, enabled: true, metricbeatUsed: false },
          apm: { count: 1, enabled: true, metricbeatUsed: true },
          metricbeatUsed: true,
        },
      ],
    });
  });

  it('should handle no monitoring data', async () => {
    const usageCollection: any = {
      makeUsageCollector: jest.fn(),
    };

    getMonitoringUsageCollector(usageCollection, config, getEsClient);
    const mock = (usageCollection.makeUsageCollector as jest.Mock).mock;
    const args = mock.calls[0];

    (fetchClusters as jest.Mock).mockImplementation(() => {
      return [];
    });

    const result = await args[0].fetch({});
    expect(result).toStrictEqual({
      hasMonitoringData: false,
      clusters: [],
    });
  });

  it('should handle scoped data', async () => {
    const usageCollection: any = {
      makeUsageCollector: jest.fn(),
    };

    getMonitoringUsageCollector(usageCollection, config, getEsClient);
    const mock = (usageCollection.makeUsageCollector as jest.Mock).mock;
    const args = mock.calls[0];

    (fetchClusters as jest.Mock).mockImplementation(() => {
      return [];
    });

    const result = await args[0].fetch({ kibanaRequest: {} });
    expect(result).toStrictEqual({
      hasMonitoringData: false,
      clusters: [],
    });
  });
});
