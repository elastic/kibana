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
      getMatchingDataStreamsStats: jest.fn().mockImplementation(() => {
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

describe('getDataStreams', () => {
  it('Passes the correct parameters to the DataStreamService', async () => {
    const esClientMock = elasticsearchServiceMock.createElasticsearchClient();
    await getDataStreamsStats({
      esClient: esClientMock,
      type: 'logs',
      datasetQuery: 'nginx',
      sortOrder: 'asc',
    });
    expect(dataStreamService.getMatchingDataStreamsStats).toHaveBeenCalledWith(expect.anything(), {
      type: 'logs',
      dataset: '*nginx*',
    });
  });
  describe('Can be sorted', () => {
    it('Ascending', async () => {
      const esClientMock = elasticsearchServiceMock.createElasticsearchClient();
      const results = await getDataStreamsStats({
        esClient: esClientMock,
        type: 'logs',
        sortOrder: 'asc',
      });
      expect(results.items[0].name).toBe('logs-elastic_agent-default');
    });
    it('Descending', async () => {
      const esClientMock = elasticsearchServiceMock.createElasticsearchClient();
      const results = await getDataStreamsStats({
        esClient: esClientMock,
        type: 'logs',
        sortOrder: 'desc',
      });
      expect(results.items[0].name).toBe('logs-test.test-default');
    });
  });
  it('Formats the items correctly', async () => {
    const esClientMock = elasticsearchServiceMock.createElasticsearchClient();
    const results = await getDataStreamsStats({
      esClient: esClientMock,
      type: 'logs',
      sortOrder: 'desc',
    });
    expect(results.items).toEqual([
      {
        name: 'logs-test.test-default',
        size: '6.2mb',
        size_bytes: 6570447,
        last_activity: 1698913802000,
      },
      {
        name: 'logs-elastic_agent.metricbeat-default',
        size: '1.6mb',
        size_bytes: 1704807,
        last_activity: 1698672046707,
      },
      {
        name: 'logs-elastic_agent.fleet_server-default',
        size: '2.9mb',
        size_bytes: 3052148,
        last_activity: 1698914110010,
      },
      {
        name: 'logs-elastic_agent.filebeat-default',
        size: '1.3mb',
        size_bytes: 1459100,
        last_activity: 1698902209996,
      },
      {
        name: 'logs-elastic_agent-default',
        size: '1gb',
        size_bytes: 1170805528,
        last_activity: 1698916071000,
      },
    ]);
  });
});
