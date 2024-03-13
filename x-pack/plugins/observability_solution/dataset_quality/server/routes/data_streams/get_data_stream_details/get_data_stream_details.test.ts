/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';

import { getDataStreamDetails } from '.';
const accessLogsDataStream = 'logs-nginx.access-default';
const errorLogsDataStream = 'logs-nginx.error-default';
const dateStr1 = '1702998651925'; // .ds-logs-nginx.access-default-2023.12.19-000001
const dateStr2 = '1703110671019'; // .ds-logs-nginx.access-default-2023.12.20-000002
const dateStr3 = '1702998866744'; // .ds-logs-nginx.error-default-2023.12.19-000001

describe('getDataStreamDetails', () => {
  afterAll(() => {
    jest.clearAllMocks();
  });

  it('throws error if index is not found', async () => {
    const esClientMock = elasticsearchServiceMock.createElasticsearchClient();
    esClientMock.indices.getSettings.mockRejectedValue(MOCK_INDEX_ERROR);

    try {
      await getDataStreamDetails({
        esClient: esClientMock,
        dataStream: 'non-existent',
      });
    } catch (e) {
      expect(e).toBe(MOCK_INDEX_ERROR);
    }
  });

  it('returns creation date of a data stream', async () => {
    const esClientMock = elasticsearchServiceMock.createElasticsearchClient();
    esClientMock.indices.getSettings.mockReturnValue(
      Promise.resolve(MOCK_NGINX_ERROR_INDEX_SETTINGS)
    );

    const dataStreamDetails = await getDataStreamDetails({
      esClient: esClientMock,
      dataStream: errorLogsDataStream,
    });
    expect(dataStreamDetails).toEqual({ createdOn: Number(dateStr3) });
  });

  it('returns the earliest creation date of a data stream with multiple backing indices', async () => {
    const esClientMock = elasticsearchServiceMock.createElasticsearchClient();
    esClientMock.indices.getSettings.mockReturnValue(
      Promise.resolve(MOCK_NGINX_ACCESS_INDEX_SETTINGS)
    );
    const dataStreamDetails = await getDataStreamDetails({
      esClient: esClientMock,
      dataStream: accessLogsDataStream,
    });
    expect(dataStreamDetails).toEqual({ createdOn: Number(dateStr1) });
  });
});

const MOCK_NGINX_ACCESS_INDEX_SETTINGS = {
  [`.ds-${accessLogsDataStream}-2023.12.19-000001`]: {
    settings: {
      index: {
        mapping: {
          total_fields: {
            limit: 10000,
          },
          ignore_malformed: true,
        },
        hidden: true,
        provided_name: '.ds-logs-nginx.access-default-2023.12.19-000001',
        final_pipeline: '.fleet_final_pipeline-1',
        query: {
          default_field: [
            'cloud.account.id',
            'cloud.availability_zone',
            'cloud.instance.id',
            'cloud.instance.name',
            'cloud.machine.type',
            'cloud.provider',
            'cloud.region',
          ],
        },
        creation_date: dateStr1,
        number_of_replicas: '1',
        uuid: 'uml9fMQqQUibZi2pKkc5sQ',
        version: {
          created: '8500007',
        },
        lifecycle: {
          name: 'logs',
          indexing_complete: true,
        },
        codec: 'best_compression',
        routing: {
          allocation: {
            include: {
              _tier_preference: 'data_hot',
            },
          },
        },
        number_of_shards: '1',
        default_pipeline: 'logs-nginx.access-1.17.0',
      },
    },
  },
  [`.ds-${accessLogsDataStream}-2023.12.20-000002`]: {
    settings: {
      index: {
        mapping: {
          total_fields: {
            limit: 10000,
          },
          ignore_malformed: true,
        },
        hidden: true,
        provided_name: '.ds-logs-nginx.access-default-2023.12.20-000002',
        final_pipeline: '.fleet_final_pipeline-1',
        query: {
          default_field: [
            'user.name',
            'user_agent.device.name',
            'user_agent.name',
            'user_agent.original',
            'user_agent.os.full',
            'user_agent.os.name',
            'user_agent.os.version',
            'user_agent.version',
            'nginx.access.remote_ip_list',
          ],
        },
        creation_date: dateStr2,
        number_of_replicas: '1',
        uuid: 'il9vJlOXRdiv44wU6WNtUQ',
        version: {
          created: '8500007',
        },
        lifecycle: {
          name: 'logs',
        },
        codec: 'best_compression',
        routing: {
          allocation: {
            include: {
              _tier_preference: 'data_hot',
            },
          },
        },
        number_of_shards: '1',
        default_pipeline: 'logs-nginx.access-1.17.0',
      },
    },
  },
};

const MOCK_NGINX_ERROR_INDEX_SETTINGS = {
  [`.ds-${errorLogsDataStream}-2023.12.19-000001`]: {
    settings: {
      index: {
        mapping: {
          total_fields: {
            limit: 10000,
          },
          ignore_malformed: true,
        },
        hidden: true,
        provided_name: '.ds-logs-nginx.error-default-2023.12.19-000001',
        final_pipeline: '.fleet_final_pipeline-1',
        query: {
          default_field: [
            'host.type',
            'input.type',
            'log.file.path',
            'log.level',
            'ecs.version',
            'message',
            'tags',
          ],
        },
        creation_date: dateStr3,
        number_of_replicas: '1',
        uuid: 'fGPYUppSRU62MZ3toF0MkQ',
        version: {
          created: '8500007',
        },
        lifecycle: {
          name: 'logs',
        },
        codec: 'best_compression',
        routing: {
          allocation: {
            include: {
              _tier_preference: 'data_hot',
            },
          },
        },
        number_of_shards: '1',
        default_pipeline: 'logs-nginx.error-1.17.0',
      },
    },
  },
};

const MOCK_INDEX_ERROR = {
  error: {
    root_cause: [
      {
        type: 'index_not_found_exception',
        reason: 'no such index [logs-nginx.error-default-01]',
        'resource.type': 'index_or_alias',
        'resource.id': 'logs-nginx.error-default-01',
        index_uuid: '_na_',
        index: 'logs-nginx.error-default-01',
      },
    ],
    type: 'index_not_found_exception',
    reason: 'no such index [logs-nginx.error-default-01]',
    'resource.type': 'index_or_alias',
    'resource.id': 'logs-nginx.error-default-01',
    index_uuid: '_na_',
    index: 'logs-nginx.error-default-01',
  },
  status: 404,
};
