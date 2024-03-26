/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchTotalHitsRelation } from '@elastic/elasticsearch/lib/api/types';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import {
  findInventoryFields,
  InventoryItemType,
  inventoryModels,
} from '@kbn/metrics-data-access-plugin/common';

import { getDataStreamDetails } from '.';
const accessLogsDataStream = 'logs-nginx.access-default';
const errorLogsDataStream = 'logs-nginx.error-default';
const dateStr1 = '1702998651925'; // .ds-logs-nginx.access-default-2023.12.19-000001
const dateStr2 = '1703110671019'; // .ds-logs-nginx.access-default-2023.12.20-000002
const dateStr3 = '1702998866744'; // .ds-logs-nginx.error-default-2023.12.19-000001

const defaultSummaryStats = {
  degradedDocsCount: 98841,
  docsCount: 617680,
  hosts: {
    'aws.rds.db_instance.arn': [],
    'aws.s3.bucket.name': [],
    'aws.sqs.queue.name': [],
    'cloud.instance.id': ['0000000000009121', '0000000000009127', '0000000000009133'],
    'container.id': [],
    'host.name': ['synth-host'],
    'kubernetes.pod.uid': [],
  },
  services: {
    'service.name': ['synth-service-0', 'synth-service-1', 'synth-service-2'],
  },
  sizeBytes: 72596354,
};

const start = Number(new Date('2020-01-01T00:00:00.000Z'));
const end = Number(new Date('2020-01-30T00:00:00.000Z'));

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
        start,
        end,
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
    esClientMock.search.mockReturnValue(Promise.resolve(MOCK_SEARCH_RESPONSE));
    esClientMock.indices.stats.mockReturnValue(Promise.resolve(MOCK_STATS_RESPONSE));

    const dataStreamDetails = await getDataStreamDetails({
      esClient: esClientMock,
      dataStream: errorLogsDataStream,
      start,
      end,
    });
    expect(dataStreamDetails).toEqual({ createdOn: Number(dateStr3), ...defaultSummaryStats });
  });

  it('returns the earliest creation date of a data stream with multiple backing indices', async () => {
    const esClientMock = elasticsearchServiceMock.createElasticsearchClient();
    esClientMock.indices.getSettings.mockReturnValue(
      Promise.resolve(MOCK_NGINX_ACCESS_INDEX_SETTINGS)
    );
    esClientMock.search.mockReturnValue(Promise.resolve(MOCK_SEARCH_RESPONSE));
    esClientMock.indices.stats.mockReturnValue(Promise.resolve(MOCK_STATS_RESPONSE));

    const dataStreamDetails = await getDataStreamDetails({
      esClient: esClientMock,
      dataStream: accessLogsDataStream,
      start,
      end,
    });
    expect(dataStreamDetails).toEqual({ createdOn: Number(dateStr1), ...defaultSummaryStats });
  });

  it('returns the correct service.name list', async () => {
    const esClientMock = elasticsearchServiceMock.createElasticsearchClient();
    esClientMock.indices.getSettings.mockReturnValue(
      Promise.resolve(MOCK_NGINX_ACCESS_INDEX_SETTINGS)
    );
    esClientMock.indices.stats.mockReturnValue(Promise.resolve(MOCK_STATS_RESPONSE));

    const serviceName = 'service.name';
    const testServiceName = ['tst-srv-0', 'tst-srv-1'];
    const mockSearchResponse = { ...MOCK_SEARCH_RESPONSE };
    mockSearchResponse.aggregations[serviceName].buckets = testServiceName.map((name) => ({
      key: name,
      doc_count: 1,
    }));
    esClientMock.search.mockReturnValue(Promise.resolve(MOCK_SEARCH_RESPONSE));

    const dataStreamDetails = await getDataStreamDetails({
      esClient: esClientMock,
      dataStream: accessLogsDataStream,
      start,
      end,
    });
    expect(dataStreamDetails.services).toEqual({ [serviceName]: testServiceName });
  });

  it('returns the correct host.name list', async () => {
    const esClientMock = elasticsearchServiceMock.createElasticsearchClient();
    esClientMock.indices.getSettings.mockReturnValue(
      Promise.resolve(MOCK_NGINX_ACCESS_INDEX_SETTINGS)
    );
    esClientMock.indices.stats.mockReturnValue(Promise.resolve(MOCK_STATS_RESPONSE));

    const hostName = 'host.name';
    const testHostName = ['tst-host-0', 'tst-host-1'];
    const hostFields = inventoryModels.map(
      (model) => findInventoryFields(model.id as InventoryItemType).id
    );
    const mockSearchResponse = { ...MOCK_SEARCH_RESPONSE };
    // Make all hosts buckets to []
    hostFields.forEach((field) => {
      mockSearchResponse.aggregations[field as 'host.name'] = { buckets: [] } as any;
    });

    // Set the host.name buckets to testHostName
    mockSearchResponse.aggregations[hostName].buckets = testHostName.map((name) => ({
      key: name,
      doc_count: 1,
    }));

    esClientMock.search.mockReturnValue(Promise.resolve(MOCK_SEARCH_RESPONSE));

    const dataStreamDetails = await getDataStreamDetails({
      esClient: esClientMock,
      dataStream: accessLogsDataStream,
      start,
      end,
    });

    // Expect all host fields to be empty
    const emptyHosts = hostFields.reduce((acc, field) => ({ ...acc, [field]: [] }), {});

    expect(dataStreamDetails.hosts).toEqual({ ...emptyHosts, [hostName]: testHostName });
  });

  it('returns correct size in bytes', async () => {
    const esClientMock = elasticsearchServiceMock.createElasticsearchClient();
    esClientMock.indices.getSettings.mockReturnValue(
      Promise.resolve(MOCK_NGINX_ACCESS_INDEX_SETTINGS)
    );
    const docsCount = 536;
    const storeDocsCount = 1220;
    const storeSizeInBytes = 2048;
    const expectedSizeInBytes = Math.ceil((storeSizeInBytes / storeDocsCount) * docsCount);

    const testStatsResponse = { ...MOCK_STATS_RESPONSE };
    testStatsResponse._all.total.docs.count = storeDocsCount;
    testStatsResponse._all.total.store.size_in_bytes = storeSizeInBytes;
    esClientMock.indices.stats.mockReturnValue(Promise.resolve(testStatsResponse));

    const mockSearchResponse = { ...MOCK_SEARCH_RESPONSE };
    mockSearchResponse.aggregations.total_count.value = docsCount;
    esClientMock.search.mockReturnValue(Promise.resolve(mockSearchResponse));

    const dataStreamDetails = await getDataStreamDetails({
      esClient: esClientMock,
      dataStream: accessLogsDataStream,
      start,
      end,
    });
    expect(dataStreamDetails.sizeBytes).toEqual(expectedSizeInBytes);
  });

  // This covers https://github.com/elastic/kibana/issues/178954
  it('returns size as NaN for when sizeStatsAvailable is false (serverless mode)', async () => {
    const esClientMock = elasticsearchServiceMock.createElasticsearchClient();
    esClientMock.indices.getSettings.mockReturnValue(
      Promise.resolve(MOCK_NGINX_ACCESS_INDEX_SETTINGS)
    );
    esClientMock.indices.stats.mockReturnValue(Promise.resolve(MOCK_STATS_RESPONSE));
    esClientMock.search.mockReturnValue(Promise.resolve(MOCK_SEARCH_RESPONSE));

    const dataStreamDetails = await getDataStreamDetails({
      esClient: esClientMock,
      dataStream: accessLogsDataStream,
      start,
      end,
      sizeStatsAvailable: false,
    });
    expect(dataStreamDetails.sizeBytes).toBeNaN();
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

const MOCK_SEARCH_RESPONSE = {
  took: 2,
  timed_out: false,
  _shards: {
    total: 1,
    successful: 1,
    skipped: 0,
    failed: 0,
  },
  hits: {
    total: {
      value: 10000,
      relation: 'gte' as SearchTotalHitsRelation,
    },
    max_score: null,
    hits: [],
  },
  aggregations: {
    total_count: {
      value: 617680,
    },
    degraded_count: {
      doc_count: 98841,
    },
    'service.name': {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [
        {
          key: 'synth-service-0',
          doc_count: 206116,
        },
        {
          key: 'synth-service-1',
          doc_count: 206012,
        },
        {
          key: 'synth-service-2',
          doc_count: 205552,
        },
      ],
    },
    'host.name': {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [
        {
          key: 'synth-host',
          doc_count: 617680,
        },
      ],
    },
    'kubernetes.pod.uid': {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [],
    },
    'container.id': {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [],
    },
    'cloud.instance.id': {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 614630,
      buckets: [
        {
          key: '0000000000009121',
          doc_count: 61,
        },
        {
          key: '0000000000009127',
          doc_count: 61,
        },
        {
          key: '0000000000009133',
          doc_count: 61,
        },
      ],
    },
    'aws.s3.bucket.name': {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [],
    },
    'aws.rds.db_instance.arn': {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [],
    },
    'aws.sqs.queue.name': {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [],
    },
  },
};

const MOCK_STATS_RESPONSE = {
  _shards: {
    total: 2,
    successful: 2,
    failed: 0,
  },
  _all: {
    primaries: {},
    total: {
      docs: {
        count: 1235360,
        deleted: 0,
      },
      shard_stats: {
        total_count: 2,
      },
      store: {
        size_in_bytes: 145192707,
        total_data_set_size_in_bytes: 145192707,
        reserved_in_bytes: 0,
      },
      indexing: {
        index_total: 1235059,
        index_time_in_millis: 98509,
        index_current: 0,
        index_failed: 0,
        delete_total: 0,
        delete_time_in_millis: 0,
        delete_current: 0,
        noop_update_total: 0,
        is_throttled: false,
        throttle_time_in_millis: 0,
        write_load: 0.00022633763414114222,
      },
    },
  },
  indices: {},
};
