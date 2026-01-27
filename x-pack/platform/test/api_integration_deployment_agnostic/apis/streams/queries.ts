/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { emptyAssets } from '@kbn/streams-schema';
import type { Streams } from '@kbn/streams-schema';
import { v4 } from 'uuid';
import { STREAMS_ESQL_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import { OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS } from '@kbn/management-settings-ids';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import type { StreamsSupertestRepositoryClient } from './helpers/repository_client';
import { createStreamsRepositoryAdminClient } from './helpers/repository_client';
import {
  deleteStream,
  disableStreams,
  enableStreams,
  getQueries,
  putStream,
} from './helpers/requests';
import type { RoleCredentials } from '../../services';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const alertingApi = getService('alertingApiCommon');
  const samlAuth = getService('samlAuth');
  const kibanaServer = getService('kibanaServer');
  let roleAuthc: RoleCredentials;

  let apiClient: StreamsSupertestRepositoryClient;

  const STREAM_NAME = 'logs.queries-test';
  const stream: Streams.WiredStream.UpsertRequest['stream'] = {
    description: '',
    ingest: {
      lifecycle: { inherit: {} },
      processing: { steps: [] },
      settings: {},
      wired: {
        routing: [],
        fields: {
          'attributes.numberfield': {
            type: 'long',
          },
        },
      },
      failure_store: { inherit: {} },
    },
  };

  describe('Queries API', function () {
    before(async () => {
      roleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('admin');
      apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
      await enableStreams(apiClient);
      await kibanaServer.uiSettings.update({
        [OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS]: true,
      });
    });

    after(async () => {
      await disableStreams(apiClient);
      await samlAuth.invalidateM2mApiKeyWithRoleScope(roleAuthc);
      await kibanaServer.uiSettings.update({
        [OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS]: false,
      });
    });

    beforeEach(async () => {
      await putStream(apiClient, STREAM_NAME, {
        stream,
        ...emptyAssets,
      });
    });

    afterEach(async () => {
      await deleteStream(apiClient, STREAM_NAME);
    });

    it('lists empty queries when none are defined on the stream', async () => {
      const response = await getQueries(apiClient, STREAM_NAME);

      expect(response).to.eql({ queries: [] });
    });

    it('lists queries when defined on the stream', async () => {
      const queries = [
        { id: v4(), title: 'OutOfMemoryError', kql: { query: "message:'OutOfMemoryError'" } },
        {
          id: v4(),
          title: 'cluster_block_exception',
          kql: { query: "message:'cluster_block_exception'" },
        },
      ];

      const updateStreamResponse = await putStream(apiClient, STREAM_NAME, {
        stream,
        ...emptyAssets,
        queries,
      });
      expect(updateStreamResponse).to.have.property('acknowledged', true);

      const getQueriesResponse = await getQueries(apiClient, STREAM_NAME);
      expect(getQueriesResponse.queries).to.eql(queries);

      const rules = await alertingApi.searchRules(
        roleAuthc,
        'alert.attributes.name:OutOfMemoryError'
      );
      expect(rules.body.data).to.have.length(1);
      expect(rules.body.data[0].rule_type_id).to.eql(STREAMS_ESQL_RULE_TYPE_ID);
      expect(rules.body.data[0].params.query).to.eql(
        `FROM ${STREAM_NAME},${STREAM_NAME}.* METADATA _id, _source | WHERE KQL("message:'OutOfMemoryError'")`
      );
    });

    describe('PUT /api/streams/{name}/queries/{queryId}', () => {
      it('inserts a query when inexistant', async () => {
        const query = {
          id: v4(),
          title: 'initial title',
          kql: { query: "message:'initial query'" },
        };
        const upsertQueryResponse = await apiClient
          .fetch('PUT /api/streams/{name}/queries/{queryId} 2023-10-31', {
            params: {
              path: { name: STREAM_NAME, queryId: query.id },
              body: {
                title: query.title,
                kql: query.kql,
              },
            },
          })
          .expect(200)
          .then((res) => res.body);
        expect(upsertQueryResponse.acknowledged).to.be(true);

        const getQueriesResponse = await getQueries(apiClient, STREAM_NAME);
        expect(getQueriesResponse.queries).to.eql([query]);

        const rules = await alertingApi.searchRules(roleAuthc, '');
        expect(rules.body.data).to.have.length(1);
        expect(rules.body.data[0].name).to.eql(query.title);
      });

      it('updates the query and create a new rule when updating an existing query kql', async () => {
        const query = {
          id: 'first',
          title: 'initial title',
          kql: { query: 'initial query' },
        };
        await putStream(apiClient, STREAM_NAME, {
          stream,
          ...emptyAssets,
          queries: [query],
        });
        const initialRules = await alertingApi.searchRules(roleAuthc, '');

        const upsertQueryResponse = await apiClient
          .fetch('PUT /api/streams/{name}/queries/{queryId} 2023-10-31', {
            params: {
              path: { name: STREAM_NAME, queryId: query.id },
              body: {
                title: query.title,
                kql: { query: 'updated query' },
              },
            },
          })
          .expect(200)
          .then((res) => res.body);
        expect(upsertQueryResponse.acknowledged).to.be(true);

        const getQueriesResponse = await getQueries(apiClient, STREAM_NAME);
        expect(getQueriesResponse.queries).to.eql([
          {
            id: query.id,
            title: query.title,
            kql: { query: 'updated query' },
          },
        ]);

        const updatedRules = await alertingApi.searchRules(roleAuthc, '');
        expect(updatedRules.body.data).to.have.length(1);
        expect(updatedRules.body.data[0].name).to.eql(query.title);
        expect(updatedRules.body.data[0].id).not.to.eql(initialRules.body.data[0].id);
      });

      it('updates the query and the rule when updating an existing query title', async () => {
        const query = {
          id: 'first',
          title: 'initial title',
          kql: { query: 'initial query' },
        };
        await putStream(apiClient, STREAM_NAME, {
          stream,
          ...emptyAssets,
          queries: [query],
        });
        const initialRules = await alertingApi.searchRules(roleAuthc, '');

        const upsertQueryResponse = await apiClient
          .fetch('PUT /api/streams/{name}/queries/{queryId} 2023-10-31', {
            params: {
              path: { name: STREAM_NAME, queryId: query.id },
              body: {
                title: 'updated title',
                kql: { query: query.kql.query },
              },
            },
          })
          .expect(200)
          .then((res) => res.body);
        expect(upsertQueryResponse.acknowledged).to.be(true);

        const getQueriesResponse = await getQueries(apiClient, STREAM_NAME);
        expect(getQueriesResponse.queries).to.eql([
          {
            id: query.id,
            title: 'updated title',
            kql: { query: query.kql.query },
          },
        ]);

        const updatedRules = await alertingApi.searchRules(roleAuthc, '');
        expect(updatedRules.body.data).to.have.length(1);
        expect(updatedRules.body.data[0].name).to.eql('updated title');
        expect(updatedRules.body.data[0].id).to.eql(initialRules.body.data[0].id);
      });

      it('returns 400 when attempting to change the feature of an existing query', async () => {
        const initialFeature = {
          name: 'initial-feature',
          filter: { field: 'host.name', eq: 'host1' },
          type: 'system' as const,
        };
        const query = {
          id: 'feature-query',
          title: 'query with feature',
          kql: { query: 'test query' },
          feature: initialFeature,
        };

        await apiClient
          .fetch('PUT /api/streams/{name}/queries/{queryId} 2023-10-31', {
            params: {
              path: { name: STREAM_NAME, queryId: query.id },
              body: {
                title: query.title,
                kql: query.kql,
                feature: initialFeature,
              },
            },
          })
          .expect(200);

        const updatedFeature = {
          name: 'updated-feature',
          filter: { field: 'host.name', eq: 'host2' },
          type: 'system' as const,
        };

        // Attempt to update with different feature - should fail
        await apiClient
          .fetch('PUT /api/streams/{name}/queries/{queryId} 2023-10-31', {
            params: {
              path: { name: STREAM_NAME, queryId: query.id },
              body: {
                title: query.title,
                kql: query.kql,
                feature: updatedFeature,
              },
            },
          })
          .expect(400);

        // Verify the query was not updated
        const getQueriesResponse = await getQueries(apiClient, STREAM_NAME);
        expect(getQueriesResponse.queries).to.eql([query]);
      });

      it('allows updating a query when the feature remains unchanged', async () => {
        const feature = {
          name: 'test-feature',
          filter: { field: 'host.name', eq: 'host1' },
          type: 'system' as const,
        };
        const query = {
          id: 'feature-query-unchanged',
          title: 'initial title',
          kql: { query: 'initial query' },
          feature,
        };

        await apiClient
          .fetch('PUT /api/streams/{name}/queries/{queryId} 2023-10-31', {
            params: {
              path: { name: STREAM_NAME, queryId: query.id },
              body: {
                title: query.title,
                kql: query.kql,
                feature,
              },
            },
          })
          .expect(200);

        const upsertQueryResponse = await apiClient
          .fetch('PUT /api/streams/{name}/queries/{queryId} 2023-10-31', {
            params: {
              path: { name: STREAM_NAME, queryId: query.id },
              body: {
                title: 'updated title',
                kql: { query: 'updated query' },
                feature,
              },
            },
          })
          .expect(200)
          .then((res) => res.body);
        expect(upsertQueryResponse.acknowledged).to.be(true);

        const getQueriesResponse = await getQueries(apiClient, STREAM_NAME);
        expect(getQueriesResponse.queries).to.eql([
          {
            id: query.id,
            title: 'updated title',
            kql: { query: 'updated query' },
            feature,
          },
        ]);
      });
    });

    it('deletes an existing query and the associated rule successfully', async () => {
      const queryId = v4();
      await putStream(apiClient, STREAM_NAME, {
        stream,
        ...emptyAssets,
        queries: [
          {
            id: queryId,
            title: 'Significant Query',
            kql: { query: "message:'query'" },
          },
        ],
      });

      const deleteQueryResponse = await apiClient
        .fetch('DELETE /api/streams/{name}/queries/{queryId} 2023-10-31', {
          params: { path: { name: STREAM_NAME, queryId } },
        })
        .expect(200)
        .then((res) => res.body);
      expect(deleteQueryResponse.acknowledged).to.be(true);

      const getQueriesResponse = await getQueries(apiClient, STREAM_NAME);
      expect(getQueriesResponse.queries).to.eql([]);

      const rules = await alertingApi.searchRules(roleAuthc, '');
      expect(rules.body.data).to.have.length(0);
    });

    it('returns a 404 when deleting an inexistant query', async () => {
      const queryId = v4();
      await apiClient
        .fetch('DELETE /api/streams/{name}/queries/{queryId} 2023-10-31', {
          params: { path: { name: STREAM_NAME, queryId } },
        })
        .expect(404);
    });

    it('bulks insert and remove queries', async () => {
      const firstQuery = {
        id: 'first',
        title: 'first query',
        kql: { query: 'query 1' },
      };
      const secondQuery = {
        id: 'second',
        title: 'second query',
        kql: { query: 'query 2' },
      };
      const thirdQuery = {
        id: 'third',
        title: 'third query',
        kql: { query: 'query 3' },
      };
      await putStream(apiClient, STREAM_NAME, {
        stream,
        ...emptyAssets,
        queries: [firstQuery, secondQuery, thirdQuery],
      });
      const initialRules = await alertingApi.searchRules(roleAuthc, '');

      const newQuery = {
        id: 'fourth',
        title: 'fourth query',
        kql: { query: 'query 4' },
      };
      const updateThirdQuery = {
        id: 'third',
        title: 'third query',
        kql: { query: 'query 3 updated' },
      };

      const bulkResponse = await apiClient
        .fetch('POST /api/streams/{name}/queries/_bulk 2023-10-31', {
          params: {
            path: { name: STREAM_NAME },
            body: {
              operations: [
                {
                  index: newQuery,
                },
                {
                  delete: {
                    id: 'inexistant',
                  },
                },
                {
                  index: updateThirdQuery,
                },
                {
                  delete: {
                    id: 'second',
                  },
                },
              ],
            },
          },
        })
        .expect(200)
        .then((res) => res.body);
      expect(bulkResponse).to.have.property('acknowledged', true);

      const getQueriesResponse = await getQueries(apiClient, STREAM_NAME);
      expect(getQueriesResponse.queries).to.eql([firstQuery, updateThirdQuery, newQuery]);

      const updatedRules = await alertingApi.searchRules(roleAuthc, '');
      expect(updatedRules.body.data).to.have.length(3);
      const ruleNames = updatedRules.body.data.map((rule: any) => rule.name);
      expect(ruleNames.includes(firstQuery.title)).to.be(true);
      expect(ruleNames.includes(updateThirdQuery.title)).to.be(true);
      expect(ruleNames.includes(newQuery.title)).to.be(true);

      const initialThirdRuleId = initialRules.body.data.find(
        (rule: any) => rule.name === thirdQuery.title
      ).id;
      expect(initialThirdRuleId).not.to.eql(
        updatedRules.body.data.find((rule: any) => rule.name === updateThirdQuery.title).id
      );
    });

    it('returns 400 when bulk operation attempts to change the feature of an existing query', async () => {
      const initialFeature = {
        name: 'initial-feature',
        filter: { field: 'host.name', eq: 'host1' },
        type: 'system' as const,
      };
      const queryWithFeature = {
        id: 'feature-query-bulk',
        title: 'query with feature',
        kql: { query: 'test query' },
        feature: initialFeature,
      };

      await apiClient
        .fetch('PUT /api/streams/{name}/queries/{queryId} 2023-10-31', {
          params: {
            path: { name: STREAM_NAME, queryId: queryWithFeature.id },
            body: {
              title: queryWithFeature.title,
              kql: queryWithFeature.kql,
              feature: initialFeature,
            },
          },
        })
        .expect(200);

      const updatedFeature = {
        name: 'updated-feature',
        filter: { field: 'host.name', eq: 'host2' },
        type: 'system' as const,
      };

      await apiClient
        .fetch('POST /api/streams/{name}/queries/_bulk 2023-10-31', {
          params: {
            path: { name: STREAM_NAME },
            body: {
              operations: [
                {
                  index: {
                    ...queryWithFeature,
                    feature: updatedFeature,
                  },
                },
              ],
            },
          },
        })
        .expect(400);

      // Verify the query was not updated
      const getQueriesResponse = await getQueries(apiClient, STREAM_NAME);
      expect(getQueriesResponse.queries).to.eql([queryWithFeature]);
    });
  });
}
