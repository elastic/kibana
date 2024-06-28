/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { dataStreamService } from '../../../services';

import { getDataStreamsStats } from '.';

jest.mock('../../../services/data_stream', () => {
  return {
    dataStreamService: {
      getStreamsStats: jest.fn().mockImplementation(() => {
        return [
          {
            data_stream: 'logs-elastic_agent-default',
            backing_indices: 1,
            store_size: '1gb',
            store_size_bytes: 1170805528,
            maximum_timestamp: 1698916071000,
          },
          {
            data_stream: 'logs-elastic_agent.filebeat-default',
            backing_indices: 1,
            store_size: '1.3mb',
            store_size_bytes: 1459100,
            maximum_timestamp: 1698902209996,
          },
          {
            data_stream: 'logs-elastic_agent.fleet_server-default',
            backing_indices: 1,
            store_size: '2.9mb',
            store_size_bytes: 3052148,
            maximum_timestamp: 1698914110010,
          },
          {
            data_stream: 'logs-elastic_agent.metricbeat-default',
            backing_indices: 1,
            store_size: '1.6mb',
            store_size_bytes: 1704807,
            maximum_timestamp: 1698672046707,
          },
          {
            data_stream: 'logs-test.test-default',
            backing_indices: 1,
            store_size: '6.2mb',
            store_size_bytes: 6570447,
            maximum_timestamp: 1698913802000,
          },
        ];
      }),
    },
  };
});
jest.mock('../../../services/index_stats', () => {
  return {
    indexStatsService: {
      getIndicesDocCounts: jest.fn().mockImplementation(() => {
        return {
          docsCountPerDataStream: {
            'logs-elastic_agent-default': 100,
            'logs-elastic_agent.filebeat-default': 200,
            'logs-elastic_agent.fleet_server-default': 0,
            'logs-elastic_agent.metricbeat-default': 245,
          },
        };
      }),
    },
  };
});

const dataStream = 'logs-nginx.access-default';

describe('getDataStreams', () => {
  it('Passes the correct parameters to the DataStreamService', async () => {
    const esClientMock = elasticsearchServiceMock.createElasticsearchClient();
    await getDataStreamsStats({
      esClient: esClientMock,
      dataStreams: [dataStream],
    });
    expect(dataStreamService.getStreamsStats).toHaveBeenCalledWith(expect.anything(), [dataStream]);
  });

  it('returns an empty list when no dataStreams are provided', async () => {
    jest.clearAllMocks();

    const esClientMock = elasticsearchServiceMock.createElasticsearchClient();
    const results = await getDataStreamsStats({
      esClient: esClientMock,
      dataStreams: [],
    });
    expect(dataStreamService.getStreamsStats).not.toHaveBeenCalled();
    expect(results.items).toEqual([]);
  });

  it('Formats the items correctly', async () => {
    const esClientMock = elasticsearchServiceMock.createElasticsearchClient();
    const results = await getDataStreamsStats({
      esClient: esClientMock,
      dataStreams: [
        'logs-elastic_agent-default',
        'logs-elastic_agent.filebeat-default',
        'logs-elastic_agent.fleet_server-default',
        'logs-elastic_agent.metricbeat-default',
        'logs-test.test-default',
      ],
    });
    expect(results.items.sort()).toEqual([
      {
        name: 'logs-elastic_agent-default',
        size: '1gb',
        sizeBytes: 1170805528,
        lastActivity: 1698916071000,
        totalDocs: 100,
      },
      {
        name: 'logs-elastic_agent.filebeat-default',
        size: '1.3mb',
        sizeBytes: 1459100,
        lastActivity: 1698902209996,
        totalDocs: 200,
      },
      {
        name: 'logs-elastic_agent.fleet_server-default',
        size: '2.9mb',
        sizeBytes: 3052148,
        lastActivity: 1698914110010,
        totalDocs: 0,
      },
      {
        name: 'logs-elastic_agent.metricbeat-default',
        size: '1.6mb',
        sizeBytes: 1704807,
        lastActivity: 1698672046707,
        totalDocs: 245,
      },
      {
        name: 'logs-test.test-default',
        size: '6.2mb',
        sizeBytes: 6570447,
        lastActivity: 1698913802000,
        totalDocs: 0,
      },
    ]);
  });
});
