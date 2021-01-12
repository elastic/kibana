/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { coreMock, elasticsearchServiceMock } from '../../../../../src/core/server/mocks';
import { getStatsWithXpack } from './get_stats_with_xpack';

const kibana = {
  kibana: {
    great: 'googlymoogly',
    versions: [{ version: '8675309', count: 1 }],
  },
  kibana_stats: {
    os: {
      platform: 'rocky',
      platformRelease: 'iv',
    },
  },
  localization: {
    locale: 'en',
    labelsCount: 0,
    integrities: {},
  },
  sun: { chances: 5 },
  clouds: { chances: 95 },
  rain: { chances: 2 },
  snow: { chances: 0 },
};
const nodesUsage = {
  some_node_id: {
    timestamp: 1588617023177,
    since: 1588616945163,
    rest_actions: {
      nodes_usage_action: 1,
    },
    aggregations: {
      terms: {
        bytes: 2,
      },
    },
  },
};

const getContext = () => ({
  version: '8675309-snapshot',
  logger: coreMock.createPluginInitializerContext().logger.get('test'),
});

const mockUsageCollection = (kibanaUsage: Record<string, unknown> = kibana) => ({
  bulkFetch: () => kibanaUsage,
  toObject: (data: any) => data,
});

/**
 * Instantiate the esClient mock with the common requests
 */
function mockEsClient() {
  const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
  // mock for license should return a basic license
  esClient.license.get.mockResolvedValue(
    // @ts-ignore we only care about the response body
    { body: { license: { type: 'basic' } } }
  );
  // mock for xpack usage should return an empty object
  esClient.xpack.usage.mockResolvedValue(
    // @ts-ignore we only care about the response body
    { body: {} }
  );
  // mock for nodes usage should resolve for this test
  esClient.nodes.usage.mockResolvedValue(
    // @ts-ignore we only care about the response body
    { body: { cluster_name: 'test cluster', nodes: nodesUsage } }
  );
  // mock for info should resolve for this test
  esClient.info.mockResolvedValue(
    // @ts-ignore we only care about the response body
    {
      body: {
        cluster_uuid: 'test',
        cluster_name: 'test',
        version: { number: '8.0.0' },
      },
    }
  );

  return esClient;
}

describe('Telemetry Collection: Get Aggregated Stats', () => {
  test('OSS-like telemetry (no license nor X-Pack telemetry)', async () => {
    const esClient = mockEsClient();
    // mock for xpack.usage should throw a 404 for this test
    esClient.xpack.usage.mockRejectedValue(new Error('Not Found'));
    // mock for license should throw a 404 for this test
    esClient.license.get.mockRejectedValue(new Error('Not Found'));

    const usageCollection = mockUsageCollection();
    const context = getContext();

    const stats = await getStatsWithXpack(
      [{ clusterUuid: '1234' }],
      {
        esClient,
        usageCollection,
      } as any,
      context
    );
    stats.forEach((entry) => {
      expect(entry).toMatchSnapshot({
        timestamp: expect.any(String),
      });
    });
  });

  test('X-Pack telemetry (license + X-Pack)', async () => {
    const esClient = mockEsClient();
    const usageCollection = mockUsageCollection();
    const context = getContext();

    const stats = await getStatsWithXpack(
      [{ clusterUuid: '1234' }],
      {
        esClient,
        usageCollection,
      } as any,
      context
    );
    stats.forEach((entry) => {
      expect(entry).toMatchSnapshot({
        timestamp: expect.any(String),
      });
    });
  });

  test('X-Pack telemetry with appended Monitoring data', async () => {
    const esClient = mockEsClient();
    const usageCollection = mockUsageCollection({
      ...kibana,
      monitoringTelemetry: [
        { collectionSource: 'monitoring', timestamp: new Date().toISOString() },
      ],
    });
    const context = getContext();

    const stats = await getStatsWithXpack(
      [{ clusterUuid: '1234' }],
      {
        esClient,
        usageCollection,
      } as any,
      context
    );
    stats.forEach((entry, index) => {
      expect(entry).toMatchSnapshot({
        timestamp: expect.any(String),
      });
    });
  });
});
