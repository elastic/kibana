/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { dataStreamService, datasetQualityPrivileges } from '../../../services';

import { getDataStreams } from '.';

const mockGetMockMatchingDataStreams = jest.fn().mockImplementation(() => MATCHING_DATA_STREAMS);
const mockGetDatasetPrivileges = jest.fn().mockImplementation(() => ({
  canRead: true,
  canMonitor: true,
  canViewIntegrations: true,
}));
const mockGetMockDataStreamPrivileges = jest.fn().mockImplementation(() => DATA_STREAMS_PRIVILEGES);

describe('getDataStreams', () => {
  beforeAll(() => {
    // Mock dataStreamService
    jest
      .spyOn(dataStreamService, 'getMatchingDataStreams')
      .mockImplementation(mockGetMockMatchingDataStreams);
    jest
      .spyOn(datasetQualityPrivileges, 'getDatasetPrivileges')
      .mockImplementation(mockGetDatasetPrivileges);
    jest
      .spyOn(datasetQualityPrivileges, 'getHasIndexPrivileges')
      .mockImplementation(mockGetMockDataStreamPrivileges);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('Returns empty list when user doesnt have access to dataset', async () => {
    const esClientMock = elasticsearchServiceMock.createElasticsearchClient();
    mockGetDatasetPrivileges.mockImplementationOnce(() => ({
      canRead: false,
      canMonitor: false,
      canViewIntegrations: false,
    }));

    const result = await getDataStreams({
      esClient: esClientMock,
      type: 'logs',
      datasetQuery: 'nginx',
      uncategorisedOnly: false,
    });
    expect(result.items).toEqual([]);
    expect(result.datasetUserPrivileges.canMonitor).toBe(false);

    expect(dataStreamService.getMatchingDataStreams).not.toHaveBeenCalled();
  });

  it('Passes the correct parameters to the DataStreamService', async () => {
    const esClientMock = elasticsearchServiceMock.createElasticsearchClient();
    const result = await getDataStreams({
      esClient: esClientMock,
      type: 'logs',
      datasetQuery: 'nginx',
      uncategorisedOnly: true,
    });
    expect(dataStreamService.getMatchingDataStreams).toHaveBeenCalledWith(
      expect.anything(),
      'logs-*nginx*'
    );

    expect(result.datasetUserPrivileges.canMonitor).toBe(true);
  });

  it('Formats the items correctly', async () => {
    const esClientMock = elasticsearchServiceMock.createElasticsearchClient();

    const results = await getDataStreams({
      esClient: esClientMock,
      type: 'logs',
      uncategorisedOnly: false,
    });
    expect(results.items.sort()).toEqual([
      {
        name: 'logs-elastic_agent-default',
        integration: 'elastic_agent',
        userPrivileges: {
          canMonitor: true,
        },
      },
      {
        name: 'logs-elastic_agent.filebeat-default',
        integration: 'elastic_agent',
        userPrivileges: {
          canMonitor: true,
        },
      },
      {
        name: 'logs-elastic_agent.fleet_server-default',
        integration: 'elastic_agent',
        userPrivileges: {
          canMonitor: true,
        },
      },
      {
        name: 'logs-elastic_agent.metricbeat-default',
        integration: 'elastic_agent',
        userPrivileges: {
          canMonitor: true,
        },
      },
      {
        name: 'logs-test.test-default',
        userPrivileges: {
          canMonitor: true,
        },
      },
    ]);
  });

  describe('uncategorisedOnly option', () => {
    it('Returns the correct number of results when true', async () => {
      const esClientMock = elasticsearchServiceMock.createElasticsearchClient();
      const results = await getDataStreams({
        esClient: esClientMock,
        type: 'logs',
        datasetQuery: 'nginx',
        uncategorisedOnly: true,
      });
      expect(results.items.length).toBe(1);
    });
    it('Returns the correct number of results when false', async () => {
      const esClientMock = elasticsearchServiceMock.createElasticsearchClient();
      const results = await getDataStreams({
        esClient: esClientMock,
        type: 'logs',
        datasetQuery: 'nginx',
        uncategorisedOnly: false,
      });
      expect(results.items.length).toBe(5);
    });
  });
});

const MATCHING_DATA_STREAMS = [
  {
    name: 'logs-elastic_agent-default',
    timestamp_field: { name: '@timestamp' },
    indices: [
      {
        index_name: '.ds-logs-elastic_agent-default-2023.05.17-000001',
        index_uuid: 'EcqQR36PTNCKVnfAftq_Rw',
      },
    ],
    generation: 1,
    _meta: { managed_by: 'fleet', managed: true, package: { name: 'elastic_agent' } },
    status: 'YELLOW',
    template: 'logs-elastic_agent',
    ilm_policy: 'logs',
    hidden: false,
    system: false,
    allow_custom_routing: false,
    replicated: false,
  },
  {
    name: 'logs-elastic_agent.filebeat-default',
    timestamp_field: { name: '@timestamp' },
    indices: [
      {
        index_name: '.ds-logs-elastic_agent.filebeat-default-2023.05.17-000001',
        index_uuid: 'v5uEn55TRrurU3Bf4CBtzw',
      },
    ],
    generation: 1,
    _meta: { managed_by: 'fleet', managed: true, package: { name: 'elastic_agent' } },
    status: 'YELLOW',
    template: 'logs-elastic_agent.filebeat',
    ilm_policy: 'logs',
    hidden: false,
    system: false,
    allow_custom_routing: false,
    replicated: false,
  },
  {
    name: 'logs-elastic_agent.fleet_server-default',
    timestamp_field: { name: '@timestamp' },
    indices: [
      {
        index_name: '.ds-logs-elastic_agent.fleet_server-default-2023.05.17-000001',
        index_uuid: 'nThe6dkaQnagAlyNsAyYsA',
      },
    ],
    generation: 1,
    _meta: { managed_by: 'fleet', managed: true, package: { name: 'elastic_agent' } },
    status: 'YELLOW',
    template: 'logs-elastic_agent.fleet_server',
    ilm_policy: 'logs',
    hidden: false,
    system: false,
    allow_custom_routing: false,
    replicated: false,
  },
  {
    name: 'logs-elastic_agent.metricbeat-default',
    timestamp_field: { name: '@timestamp' },
    indices: [
      {
        index_name: '.ds-logs-elastic_agent.metricbeat-default-2023.05.17-000001',
        index_uuid: 'Y5vQ7V6-QSSMM-CPdqOkCg',
      },
    ],
    generation: 1,
    _meta: { managed_by: 'fleet', managed: true, package: { name: 'elastic_agent' } },
    status: 'YELLOW',
    template: 'logs-elastic_agent.metricbeat',
    ilm_policy: 'logs',
    hidden: false,
    system: false,
    allow_custom_routing: false,
    replicated: false,
  },
  {
    name: 'logs-test.test-default',
    timestamp_field: { name: '@timestamp' },
    indices: [
      {
        index_name: '.ds-logs-elastic_agent.metricbeat-default-2023.05.17-000001',
        index_uuid: 'Y5vQ7V6-QSSMM-CPdqOkCg',
      },
    ],
  },
];

const DATA_STREAMS_PRIVILEGES = Object.values(MATCHING_DATA_STREAMS).reduce((acc, stream) => {
  acc[stream.name] = true;

  return acc;
}, {} as Record<string, boolean>);
