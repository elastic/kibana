/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { Streams } from '@kbn/streams-schema';
import {
  OBSERVABILITY_STREAMS_ENABLE_ATTACHMENTS,
  OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS,
} from '@kbn/management-settings-ids';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import { disableStreams, enableStreams, indexDocument } from './helpers/requests';
import type { StreamsSupertestRepositoryClient } from './helpers/repository_client';
import { createStreamsRepositoryAdminClient } from './helpers/repository_client';
import { loadDashboards } from './helpers/dashboards';

const TEST_STREAM_NAME = 'logs-test-default';
const WIRED_STREAM_NAME = 'logs.wiredChild';
const TEST_DASHBOARD_ID = '9230e631-1f1a-476d-b613-4b074c6cfdd0';

const oldProcessing = [
  {
    grok: {
      field: 'message',
      patterns: [
        '%{TIMESTAMP_ISO8601:inner_timestamp} %{LOGLEVEL:log.level} %{GREEDYDATA:message2}',
      ],
      if: { always: {} },
    },
  },
  {
    set: {
      field: 'message',
      value: 'newValue',
      if: { operator: 'eq', field: 'message', value: 'oldValue' },
    },
  },
];

const migratedProcessing = {
  steps: [
    {
      action: 'manual_ingest_pipeline' as const,
      ignore_failure: true,
      processors: [
        {
          grok: {
            field: 'message',
            if: 'return true',
            patterns: [
              '%{TIMESTAMP_ISO8601:inner_timestamp} %{LOGLEVEL:log.level} %{GREEDYDATA:message2}',
            ],
          },
        },
        {
          set: {
            field: 'message',
            if: '\n  try {\n  \n  def val_message = $(\'message\', null); if (val_message instanceof List && val_message.size() == 1) { val_message = val_message[0]; }\n  \n  \n  if ((val_message !== null && ((val_message instanceof Number && val_message.toString() == "oldValue") || val_message == "oldValue"))) {\n    return true;\n  }\n  return false;\n} catch (Exception e) {\n  return false;\n}\n',
            value: 'newValue',
          },
        },
      ],
      where: {
        always: {},
      },
    },
  ],
  updated_at: new Date(0).toISOString(),
};

// Do not update these if tests are failing - this is testing whether they get migrated correctly - you should
// always make sure that existing definitions and links keep working.

const assetLinks = [
  {
    'asset.type': 'query',
    'asset.id': '12345',
    'asset.uuid': '761ea54139754abb6e486ec1e29ea5c7f4df1387',
    'stream.name': TEST_STREAM_NAME,
    'query.title': 'Test',
    'query.kql.query': 'atest',
  },
];

const attachmentLinks = [
  {
    'attachment.type': 'dashboard',
    'attachment.id': TEST_DASHBOARD_ID,
    'attachment.uuid': 'a9e60eb2bc5fa77d1f66a612db29d2764ff8cf4a',
    'stream.names': [TEST_STREAM_NAME],
  },
];

const streamDefinition = {
  name: TEST_STREAM_NAME,
  ingest: {
    lifecycle: {
      ilm: {
        policy: 'logs-default',
      },
    },
    processing: oldProcessing,
    unwired: {},
  },
};

const wiredStreamDefinition = {
  name: WIRED_STREAM_NAME,
  ingest: {
    lifecycle: {
      ilm: {
        policy: 'logs-default',
      },
    },
    processing: oldProcessing,
    wired: {
      routing: [
        {
          destination: 'logs.wiredChild.child',
          if: {
            field: 'resource.attributes.host.name',
            operator: 'eq' as const,
            value: 'myHost',
          },
        },
      ],
      fields: {
        'attributes.message2': {
          type: 'match_only_text',
        },
      },
    },
  },
};

const expectedStreamsResponse: Streams.ClassicStream.Definition = {
  name: TEST_STREAM_NAME,
  description: '',
  updated_at: new Date(0).toISOString(),
  query_streams: [],
  ingest: {
    lifecycle: {
      ilm: {
        policy: 'logs-default',
      },
    },
    // The old processing array is migrated to Streamlang DSL.
    // Old processor definitions are migrated to a single manual_ingest_pipeline processor.
    processing: migratedProcessing,
    settings: {},
    classic: {},
    failure_store: { inherit: {} },
  },
};

const expectedWiredStreamsResponse: Streams.WiredStream.Definition = {
  name: WIRED_STREAM_NAME,
  description: '',
  updated_at: new Date(0).toISOString(),
  query_streams: [],
  ingest: {
    lifecycle: {
      ilm: {
        policy: 'logs-default',
      },
    },
    // The old processing array is migrated to Streamlang DSL.
    // Old processor definitions are migrated to a single manual_ingest_pipeline processor.
    processing: migratedProcessing,
    settings: {},
    wired: {
      routing: [
        {
          destination: 'logs.wiredChild.child',
          where: {
            field: 'resource.attributes.host.name',
            eq: 'myHost',
          },
          status: 'enabled',
        },
      ],
      fields: {
        'attributes.message2': {
          type: 'match_only_text',
        },
      },
    },
    failure_store: { inherit: {} },
  },
};

const expectedDashboard = {
  id: TEST_DASHBOARD_ID,
  redirectId: TEST_DASHBOARD_ID,
  title: 'dashboard-4-panels',
  type: 'dashboard',
  tags: [],
  description: '',
  streamNames: [TEST_STREAM_NAME],
};

const expectedQueriesResponse = {
  queries: [
    {
      id: '12345',
      title: 'Test',
      kql: { query: 'atest' },
    },
  ],
};

function expectStreams(expectedStreams: string[], persistedStreams: Streams.all.Definition[]) {
  for (const name of expectedStreams) {
    expect(persistedStreams.some((stream) => stream.name === name)).to.eql(true);
  }
}

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  let apiClient: StreamsSupertestRepositoryClient;
  const esClient = getService('es');
  const kibanaServer = getService('kibanaServer');
  const SPACE_ID = 'default';
  const ARCHIVES = [
    'src/platform/test/api_integration/fixtures/kbn_archiver/saved_objects/content_pack_four_panels.json',
  ];

  // This test verifies that it's still possible to read an existing stream definition without
  // error. If it fails, it indicates that the migration logic is not working as expected.
  describe('read existing stream definition and asset link format', function () {
    // This test can't run on MKI because there is no way to create a stream definition document that doesn't match the
    // currently valid format. The test is designed to verify that the migration logic is working correctly.
    this.tags(['failsOnMKI']);
    before(async () => {
      await loadDashboards(kibanaServer, ARCHIVES, SPACE_ID);
      apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
      await enableStreams(apiClient);
      await kibanaServer.uiSettings.update({
        [OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS]: true,
        [OBSERVABILITY_STREAMS_ENABLE_ATTACHMENTS]: true,
      });
      // link and unlink dashboard to make sure attachments index is created
      await apiClient.fetch(
        'PUT /api/streams/{streamName}/attachments/{attachmentType}/{attachmentId} 2023-10-31',
        {
          params: {
            path: {
              streamName: 'logs',
              attachmentType: 'dashboard',
              attachmentId: TEST_DASHBOARD_ID,
            },
          },
        }
      );
      await apiClient.fetch(
        'DELETE /api/streams/{streamName}/attachments/{attachmentType}/{attachmentId} 2023-10-31',
        {
          params: {
            path: {
              streamName: 'logs',
              attachmentType: 'dashboard',
              attachmentId: TEST_DASHBOARD_ID,
            },
          },
        }
      );
      // link and unlink query asset to make sure assets index is created
      await apiClient.fetch('PUT /api/streams/{name}/queries/{queryId} 2023-10-31', {
        params: {
          path: {
            name: 'logs',
            queryId: 'test-query-init',
          },
          body: {
            title: 'Init Query',
            kql: { query: 'test' },
          },
        },
      });
      await apiClient.fetch('DELETE /api/streams/{name}/queries/{queryId} 2023-10-31', {
        params: {
          path: {
            name: 'logs',
            queryId: 'test-query-init',
          },
        },
      });

      await esClient.index({
        index: '.kibana_streams-000001',
        id: TEST_STREAM_NAME,
        document: streamDefinition,
      });

      await esClient.index({
        index: '.kibana_streams-000001',
        id: WIRED_STREAM_NAME,
        document: wiredStreamDefinition,
      });

      await Promise.all(
        assetLinks.map((link) =>
          esClient.index({
            index: '.kibana_streams_assets-000001',
            id: link['asset.uuid'],
            document: link,
          })
        )
      );

      await Promise.all(
        attachmentLinks.map((link) =>
          esClient.index({
            index: '.kibana_streams_attachments-000001',
            id: link['attachment.uuid'],
            document: link,
          })
        )
      );

      // Refresh the index to make the document searchable
      await esClient.indices.refresh({ index: '.kibana_streams-000001' });
      await esClient.indices.refresh({ index: '.kibana_streams_assets-000001' });
      await esClient.indices.refresh({ index: '.kibana_streams_attachments-000001' });
    });

    after(async () => {
      await disableStreams(apiClient);
      await esClient.indices.deleteDataStream({ name: TEST_STREAM_NAME });
      await kibanaServer.uiSettings.update({
        [OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS]: false,
        [OBSERVABILITY_STREAMS_ENABLE_ATTACHMENTS]: false,
      });
    });

    it('should read and return existing orphaned classic stream', async () => {
      const getResponse = await apiClient.fetch('GET /api/streams/{name} 2023-10-31', {
        params: {
          path: { name: TEST_STREAM_NAME },
        },
      });

      expect(getResponse.status).to.eql(200);
      expect(getResponse.body.stream).to.eql(expectedStreamsResponse);

      const listResponse = await apiClient.fetch('GET /api/streams 2023-10-31');
      expect(listResponse.status).to.eql(200);
      expectStreams(['logs', TEST_STREAM_NAME], listResponse.body.streams);

      const dashboardResponse = await apiClient.fetch(
        'GET /api/streams/{streamName}/attachments 2023-10-31',
        {
          params: {
            path: { streamName: TEST_STREAM_NAME },
            query: { attachmentTypes: ['dashboard'] },
          },
        }
      );
      expect(dashboardResponse.status).to.eql(200);
    });

    it('should read and return existing regular classic stream', async () => {
      const doc = {
        message: '2023-01-01T00:00:10.000Z error test',
      };
      const response = await indexDocument(esClient, TEST_STREAM_NAME, doc);
      expect(response.result).to.eql('created');
      const getResponse = await apiClient.fetch('GET /api/streams/{name} 2023-10-31', {
        params: {
          path: { name: TEST_STREAM_NAME },
        },
      });

      expect(getResponse.status).to.eql(200);
      expect(getResponse.body.stream).to.eql(expectedStreamsResponse);

      const listResponse = await apiClient.fetch('GET /api/streams 2023-10-31');
      expect(listResponse.status).to.eql(200);
      expectStreams(['logs', TEST_STREAM_NAME], listResponse.body.streams);

      const dashboardResponse = await apiClient.fetch(
        'GET /api/streams/{streamName}/attachments 2023-10-31',
        {
          params: {
            path: { streamName: TEST_STREAM_NAME },
            query: { attachmentTypes: ['dashboard'] },
          },
        }
      );
      expect(dashboardResponse.status).to.eql(200);
    });

    it('should read expected dashboards for classic stream', async () => {
      const response = await apiClient.fetch(
        'GET /api/streams/{streamName}/attachments 2023-10-31',
        {
          params: {
            path: { streamName: TEST_STREAM_NAME },
            query: { attachmentTypes: ['dashboard'] },
          },
        }
      );
      expect(response.status).to.eql(200);
      expect(response.body.attachments).to.have.length(1);
      const { createdAt, updatedAt, ...rest } = response.body.attachments[0];
      expect(rest).to.eql(expectedDashboard);
      expect(createdAt).to.be.a('string');
      expect(updatedAt).to.be.a('string');
    });

    it('should read expected queries for classic stream', async () => {
      const response = await apiClient.fetch('GET /api/streams/{name}/queries 2023-10-31', {
        params: {
          path: { name: TEST_STREAM_NAME },
        },
      });
      expect(response.status).to.eql(200);
      expect(response.body.queries).to.eql(expectedQueriesResponse.queries);
    });

    it('should migrate routing "if" condition to Streamlang syntax in wired streams', async () => {
      const getResponse = await apiClient.fetch('GET /api/streams/{name} 2023-10-31', {
        params: {
          path: { name: WIRED_STREAM_NAME },
        },
      });
      expect(getResponse.status).to.eql(200);
      expect(getResponse.body.stream).to.eql(expectedWiredStreamsResponse);
    });
  });
}
