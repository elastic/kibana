/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { dataStreamService } from '../../../services';

import { getDataStreams } from '.';

jest.mock('../../../services/data_stream', () => {
  return {
    dataStreamService: {
      getMatchingDataStreams: jest.fn().mockImplementation(() => {
        return [
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
      }),
    },
  };
});

describe('getDataStreams', () => {
  it('Passes the correct parameters to the DataStreamService', async () => {
    const esClientMock = elasticsearchServiceMock.createElasticsearchClient();
    await getDataStreams({
      esClient: esClientMock,
      type: 'logs',
      datasetQuery: 'nginx',
      uncategorisedOnly: true,
    });
    expect(dataStreamService.getMatchingDataStreams).toHaveBeenCalledWith(expect.anything(), {
      type: 'logs',
      dataset: '*nginx*',
    });
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
      },
      {
        name: 'logs-elastic_agent.filebeat-default',
        integration: 'elastic_agent',
      },
      {
        name: 'logs-elastic_agent.fleet_server-default',
        integration: 'elastic_agent',
      },
      {
        name: 'logs-elastic_agent.metricbeat-default',
        integration: 'elastic_agent',
      },
      { name: 'logs-test.test-default' },
    ]);
  });
});
