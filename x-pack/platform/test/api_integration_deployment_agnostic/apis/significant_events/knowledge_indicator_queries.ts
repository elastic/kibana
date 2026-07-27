/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { omit, sortBy } from 'lodash';
import { emptyAssets } from '@kbn/streams-schema';
import type { Streams } from '@kbn/streams-schema';
import type { BaseFeature } from '@kbn/significant-events-schema';
import { v4 } from 'uuid';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import type { SignificantEventsSupertestRepositoryClient } from './helpers/repository_client';
import { createStreamsRepositoryAdminClient } from './helpers/repository_client';
import { bulkQueries, getQueries, deleteFeature, upsertFeature } from './helpers/requests';
import {
  deleteStream,
  disableStreams,
  enableStreams,
  putStream,
} from '../streams/helpers/requests';
import type { RoleCredentials } from '../../services';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const alertingApi = getService('alertingApiCommon');
  const samlAuth = getService('samlAuth');
  let roleAuthc: RoleCredentials;

  let apiClient: SignificantEventsSupertestRepositoryClient;

  const STREAM_NAME = 'logs.otel.queries-test';
  const stream: Streams.WiredStream.UpsertRequest['stream'] = {
    type: 'wired',
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
    });

    after(async () => {
      await disableStreams(apiClient);
      await samlAuth.invalidateM2mApiKeyWithRoleScope(roleAuthc);
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
        {
          id: v4(),
          type: 'match' as const,
          title: 'OutOfMemoryError',
          description: '',
          esql: {
            query: `FROM ${STREAM_NAME},${STREAM_NAME}.* METADATA _id, _source | WHERE KQL("message:'OutOfMemoryError'")`,
          },
        },
        {
          id: v4(),
          type: 'match' as const,
          title: 'cluster_block_exception',
          description: '',
          esql: {
            query: `FROM ${STREAM_NAME},${STREAM_NAME}.* METADATA _id, _source | WHERE KQL("message:'cluster_block_exception'")`,
          },
        },
      ];

      const bulkResponse = await bulkQueries(
        apiClient,
        STREAM_NAME,
        queries.map((query) => ({ index: omit(query, 'type') }))
      );
      expect(bulkResponse).to.have.property('acknowledged', true);

      const getQueriesResponse = await getQueries(apiClient, STREAM_NAME);
      expect(sortBy(getQueriesResponse.queries, 'id')).to.eql(sortBy(queries, 'id'));

      const rules = await alertingApi.searchRulesV2(roleAuthc, { search: 'OutOfMemoryError' });
      expect(rules.body.items).to.have.length(1);
      expect(rules.body.items[0].kind).to.eql('signal');
      // The stored breach query is pretty-printed (via BasicPrettyPrinter in
      // stripMetadata), which normalizes the FROM source list to `a, b` with a
      // space after the comma. Assert against that normalized form.
      expect(rules.body.items[0].query.breach.query).to.contain(
        `FROM ${STREAM_NAME}, ${STREAM_NAME}.* METADATA _id`
      );
      expect(rules.body.items[0].query.breach.query).not.to.contain('_source');
    });

    it('rejects a stray top-level `queries` field on PUT and leaves detections unchanged', async () => {
      // Significant-event queries are not part of the stream upsert; request validation rejects a
      // stray `queries` field (DeepStrict) instead of silently dropping it. Cast past the type
      // that no longer allows `queries`.
      await putStream(
        apiClient,
        STREAM_NAME,
        {
          stream,
          ...emptyAssets,
          queries: [
            {
              id: v4(),
              title: 'stray query',
              esql: {
                query: `FROM ${STREAM_NAME},${STREAM_NAME}.* METADATA _id, _source | WHERE KQL("message:'stray'")`,
              },
            },
          ],
        } as Streams.WiredStream.UpsertRequest,
        400
      );

      const getQueriesResponse = await getQueries(apiClient, STREAM_NAME);
      expect(getQueriesResponse.queries).to.eql([]);
    });

    describe('PUT /api/streams/{name}/queries/{queryId}', () => {
      it('inserts a query when inexistant', async () => {
        const query = {
          id: v4(),
          type: 'match' as const,
          title: 'initial title',
          description: '',
          esql: {
            query: `FROM ${STREAM_NAME},${STREAM_NAME}.* METADATA _id, _source | WHERE KQL("message:'initial query'")`,
          },
        };
        const upsertQueryResponse = await apiClient
          .fetch('PUT /api/streams/{name}/queries/{queryId} 2023-10-31', {
            params: {
              path: { name: STREAM_NAME, queryId: query.id },
              body: {
                title: query.title,
                esql: query.esql,
              },
            },
          })
          .expect(200)
          .then((res) => res.body);
        expect(upsertQueryResponse.acknowledged).to.be(true);

        const getQueriesResponse = await getQueries(apiClient, STREAM_NAME);
        expect(getQueriesResponse.queries).to.eql([query]);

        const rules = await alertingApi.searchRulesV2(roleAuthc);
        expect(rules.body.items).to.have.length(1);
        expect(rules.body.items[0].metadata.name).to.eql(query.title);
      });

      it('returns 400 and does not save when ES|QL query is missing METADATA _id,_source', async () => {
        const queryId = v4();
        await apiClient
          .fetch('PUT /api/streams/{name}/queries/{queryId} 2023-10-31', {
            params: {
              path: { name: STREAM_NAME, queryId },
              body: {
                title: 'missing metadata',
                esql: { query: `FROM ${STREAM_NAME},${STREAM_NAME}.* | WHERE KQL("message:'x'")` },
              },
            },
          })
          .expect(400);

        const getQueriesResponse = await getQueries(apiClient, STREAM_NAME);
        expect(getQueriesResponse.queries).to.eql([]);
      });

      it('returns 400 and does not save when ES|QL query references invalid sources', async () => {
        const queryId = v4();
        await apiClient
          .fetch('PUT /api/streams/{name}/queries/{queryId} 2023-10-31', {
            params: {
              path: { name: STREAM_NAME, queryId },
              body: {
                title: 'invalid sources',
                esql: { query: 'FROM logs.ecs METADATA _id, _source' },
              },
            },
          })
          .expect(400);

        const getQueriesResponse = await getQueries(apiClient, STREAM_NAME);
        expect(getQueriesResponse.queries).to.eql([]);
      });

      it('updates the query and recreates its rule when updating an existing query ES|QL', async () => {
        const query = {
          id: 'first',
          type: 'match' as const,
          title: 'initial title',
          description: '',
          esql: {
            query: `FROM ${STREAM_NAME},${STREAM_NAME}.* METADATA _id, _source | WHERE KQL("initial query")`,
          },
        };
        await bulkQueries(apiClient, STREAM_NAME, [{ index: omit(query, 'type') }]);
        const initialRules = await alertingApi.searchRulesV2(roleAuthc);

        const updatedEsql = `FROM ${STREAM_NAME},${STREAM_NAME}.* METADATA _id, _source | WHERE KQL("updated query")`;
        const upsertQueryResponse = await apiClient
          .fetch('PUT /api/streams/{name}/queries/{queryId} 2023-10-31', {
            params: {
              path: { name: STREAM_NAME, queryId: query.id },
              body: {
                title: query.title,
                esql: { query: updatedEsql },
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
            type: 'match',
            title: query.title,
            description: '',
            esql: { query: updatedEsql },
          },
        ]);

        const updatedRules = await alertingApi.searchRulesV2(roleAuthc);
        expect(updatedRules.body.items).to.have.length(1);
        expect(updatedRules.body.items[0].metadata.name).to.eql(query.title);
        // The rule id is content-addressed on the ES|QL (computeRuleId hashes
        // stream/query id/esql), so changing the ES|QL is a breaking change that
        // recreates the rule under a new id rather than updating it in place.
        expect(updatedRules.body.items[0].id).not.to.eql(initialRules.body.items[0].id);
      });

      it('updates the query and the rule when updating an existing query title', async () => {
        const query = {
          id: 'first',
          type: 'match' as const,
          title: 'initial title',
          description: '',
          esql: {
            query: `FROM ${STREAM_NAME},${STREAM_NAME}.* METADATA _id, _source | WHERE KQL("initial query")`,
          },
        };
        await bulkQueries(apiClient, STREAM_NAME, [{ index: omit(query, 'type') }]);
        const initialRules = await alertingApi.searchRulesV2(roleAuthc);

        const upsertQueryResponse = await apiClient
          .fetch('PUT /api/streams/{name}/queries/{queryId} 2023-10-31', {
            params: {
              path: { name: STREAM_NAME, queryId: query.id },
              body: {
                title: 'updated title',
                esql: query.esql,
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
            type: 'match',
            title: 'updated title',
            description: '',
            esql: { query: query.esql.query },
          },
        ]);

        const updatedRules = await alertingApi.searchRulesV2(roleAuthc);
        expect(updatedRules.body.items).to.have.length(1);
        expect(updatedRules.body.items[0].metadata.name).to.eql('updated title');
        expect(updatedRules.body.items[0].id).to.eql(initialRules.body.items[0].id);
      });
    });

    it('deletes an existing query and the associated rule successfully', async () => {
      const queryId = v4();
      await bulkQueries(apiClient, STREAM_NAME, [
        {
          index: {
            id: queryId,
            title: 'Significant Query',
            description: '',
            esql: {
              query: `FROM ${STREAM_NAME},${STREAM_NAME}.* METADATA _id, _source | WHERE KQL("message:'query'")`,
            },
          },
        },
      ]);

      const deleteQueryResponse = await apiClient
        .fetch('DELETE /api/streams/{name}/queries/{queryId} 2023-10-31', {
          params: { path: { name: STREAM_NAME, queryId } },
        })
        .expect(200)
        .then((res) => res.body);
      expect(deleteQueryResponse.acknowledged).to.be(true);

      const getQueriesResponse = await getQueries(apiClient, STREAM_NAME);
      expect(getQueriesResponse.queries).to.eql([]);

      const rules = await alertingApi.searchRulesV2(roleAuthc);
      expect(rules.body.items).to.have.length(0);
    });

    it('returns a 404 when deleting an inexistant query', async () => {
      const queryId = v4();
      await apiClient
        .fetch('DELETE /api/streams/{name}/queries/{queryId} 2023-10-31', {
          params: { path: { name: STREAM_NAME, queryId } },
        })
        .expect(404);
    });

    it('deletes an already-expired query instead of reporting it as not found', async () => {
      // The existence check must pass includeExpired, or an expired query looks gone.
      const queryId = v4();
      await apiClient
        .fetch('PUT /api/streams/{name}/queries/{queryId} 2023-10-31', {
          params: {
            path: { name: STREAM_NAME, queryId },
            body: {
              title: 'already expired',
              esql: {
                query: `FROM ${STREAM_NAME},${STREAM_NAME}.* METADATA _id, _source | WHERE KQL("message:'expired'")`,
              },
              expires_at: '2020-01-01T00:00:00.000Z',
            },
          },
        })
        .expect(200);
      expect((await getQueries(apiClient, STREAM_NAME)).queries).to.eql([]);

      const deleteQueryResponse = await apiClient
        .fetch('DELETE /api/streams/{name}/queries/{queryId} 2023-10-31', {
          params: { path: { name: STREAM_NAME, queryId } },
        })
        .expect(200)
        .then((res) => res.body);
      expect(deleteQueryResponse.acknowledged).to.be(true);

      const rules = await alertingApi.searchRulesV2(roleAuthc);
      expect(rules.body.items).to.have.length(0);

      // Repeating the delete on the same id must now 404, proving it was a real
      // delete and not another silent no-op.
      await apiClient
        .fetch('DELETE /api/streams/{name}/queries/{queryId} 2023-10-31', {
          params: { path: { name: STREAM_NAME, queryId } },
        })
        .expect(404);
    });

    it('cleans up an already-expired query and its rule when the stream itself is deleted', async () => {
      const queryId = v4();
      await apiClient
        .fetch('PUT /api/streams/{name}/queries/{queryId} 2023-10-31', {
          params: {
            path: { name: STREAM_NAME, queryId },
            body: {
              title: 'lingering expired query',
              esql: {
                query: `FROM ${STREAM_NAME},${STREAM_NAME}.* METADATA _id, _source | WHERE KQL("message:'lingering'")`,
              },
              expires_at: '2020-01-01T00:00:00.000Z',
            },
          },
        })
        .expect(200);

      // Deliberately left in place, expired but never explicitly deleted, so
      // teardown (deleteStream -> deleteAllQueries) must be the one to catch it.
      await deleteStream(apiClient, STREAM_NAME);

      const rules = await alertingApi.searchRulesV2(roleAuthc);
      expect(rules.body.items).to.have.length(0);

      // Recreate so the outer afterEach's deleteStream (expecting 200) doesn't 404.
      await putStream(apiClient, STREAM_NAME, { stream, ...emptyAssets });
    });

    it('bulks insert and remove queries', async () => {
      const firstQuery = {
        id: 'first',
        type: 'match' as const,
        title: 'first query',
        description: '',
        esql: {
          query: `FROM ${STREAM_NAME},${STREAM_NAME}.* METADATA _id, _source | WHERE KQL("query 1")`,
        },
      };
      const secondQuery = {
        id: 'second',
        type: 'match' as const,
        title: 'second query',
        description: '',
        esql: {
          query: `FROM ${STREAM_NAME},${STREAM_NAME}.* METADATA _id, _source | WHERE KQL("query 2")`,
        },
      };
      const thirdQuery = {
        id: 'third',
        type: 'match' as const,
        title: 'third query',
        description: '',
        esql: {
          query: `FROM ${STREAM_NAME},${STREAM_NAME}.* METADATA _id, _source | WHERE KQL("query 3")`,
        },
      };
      await bulkQueries(
        apiClient,
        STREAM_NAME,
        [firstQuery, secondQuery, thirdQuery].map((query) => ({ index: omit(query, 'type') }))
      );
      const initialRules = await alertingApi.searchRulesV2(roleAuthc);

      const newQuery = {
        id: 'fourth',
        title: 'fourth query',
        description: '',
        esql: {
          query: `FROM ${STREAM_NAME},${STREAM_NAME}.* METADATA _id, _source | WHERE KQL("query 4")`,
        },
      };
      const updateThirdQuery = {
        id: 'third',
        title: 'third query',
        description: '',
        esql: {
          query: `FROM ${STREAM_NAME},${STREAM_NAME}.* METADATA _id, _source | WHERE KQL("query 3 updated")`,
        },
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
      const expectedQueries = [
        firstQuery,
        { ...updateThirdQuery, type: 'match' },
        { ...newQuery, type: 'match' },
      ];
      expect(sortBy(getQueriesResponse.queries, 'id')).to.eql(sortBy(expectedQueries, 'id'));

      const updatedRules = await alertingApi.searchRulesV2(roleAuthc);
      expect(updatedRules.body.items).to.have.length(3);
      const ruleNames = updatedRules.body.items.map((rule: any) => rule.metadata.name);
      expect(ruleNames.includes(firstQuery.title)).to.be(true);
      expect(ruleNames.includes(updateThirdQuery.title)).to.be(true);
      expect(ruleNames.includes(newQuery.title)).to.be(true);

      const initialThirdRuleId = initialRules.body.items.find(
        (rule: any) => rule.metadata.name === thirdQuery.title
      ).id;
      // The third query's ES|QL changed in the bulk, so its rule is recreated
      // under a new (content-addressed) id rather than updated in place.
      expect(initialThirdRuleId).not.to.eql(
        updatedRules.body.items.find((rule: any) => rule.metadata.name === updateThirdQuery.title)
          .id
      );
    });

    it('returns 400 and does not apply changes when bulk includes an invalid ES|QL query', async () => {
      const firstQuery = {
        id: 'first',
        type: 'match' as const,
        title: 'first query',
        description: '',
        esql: {
          query: `FROM ${STREAM_NAME},${STREAM_NAME}.* METADATA _id, _source | WHERE KQL("query 1")`,
        },
      };
      await bulkQueries(apiClient, STREAM_NAME, [{ index: omit(firstQuery, 'type') }]);

      const invalidQuery = {
        id: 'invalid',
        title: 'invalid query',
        description: '',
        esql: {
          query: `FROM ${STREAM_NAME},${STREAM_NAME}.* | WHERE KQL("query invalid")`,
        },
      };

      await apiClient
        .fetch('POST /api/streams/{name}/queries/_bulk 2023-10-31', {
          params: {
            path: { name: STREAM_NAME },
            body: {
              operations: [{ index: invalidQuery }, { delete: { id: firstQuery.id } }],
            },
          },
        })
        .expect(400);

      const getQueriesResponse = await getQueries(apiClient, STREAM_NAME);
      expect(getQueriesResponse.queries).to.eql([firstQuery]);
    });

    describe('POST /internal/streams/queries/_bulk_delete', () => {
      const SECOND_STREAM_NAME = 'logs.otel.queries-test-bulk-delete';

      beforeEach(async () => {
        await putStream(apiClient, SECOND_STREAM_NAME, { stream, ...emptyAssets });
      });

      afterEach(async () => {
        await deleteStream(apiClient, SECOND_STREAM_NAME);
      });

      it('deletes queries across multiple streams in one request', async () => {
        const firstQuery = {
          id: v4(),
          title: 'cross-stream bulk delete 1',
          description: '',
          esql: {
            query: `FROM ${STREAM_NAME},${STREAM_NAME}.* METADATA _id, _source | WHERE KQL("message:'q1'")`,
          },
        };
        const secondQuery = {
          id: v4(),
          title: 'cross-stream bulk delete 2',
          description: '',
          esql: {
            query: `FROM ${SECOND_STREAM_NAME},${SECOND_STREAM_NAME}.* METADATA _id, _source | WHERE KQL("message:'q2'")`,
          },
        };

        await apiClient
          .fetch('POST /api/streams/{name}/queries/_bulk 2023-10-31', {
            params: {
              path: { name: STREAM_NAME },
              body: { operations: [{ index: firstQuery }] },
            },
          })
          .expect(200);
        await apiClient
          .fetch('POST /api/streams/{name}/queries/_bulk 2023-10-31', {
            params: {
              path: { name: SECOND_STREAM_NAME },
              body: { operations: [{ index: secondQuery }] },
            },
          })
          .expect(200);

        const response = await apiClient
          .fetch('POST /internal/streams/queries/_bulk_delete', {
            params: { body: { queryIds: [firstQuery.id, secondQuery.id] } },
          })
          .expect(200)
          .then((res) => res.body);

        expect(response).to.eql({ succeeded: 2, failed: 0, skipped: 0 });
        expect((await getQueries(apiClient, STREAM_NAME)).queries).to.eql([]);
        expect((await getQueries(apiClient, SECOND_STREAM_NAME)).queries).to.eql([]);
      });

      it('partitions valid and unknown ids within a single request', async () => {
        const query = {
          id: v4(),
          title: 'partition test',
          description: '',
          esql: {
            query: `FROM ${STREAM_NAME},${STREAM_NAME}.* METADATA _id, _source | WHERE KQL("message:'partition'")`,
          },
        };
        await bulkQueries(apiClient, STREAM_NAME, [{ index: query }]);

        const response = await apiClient
          .fetch('POST /internal/streams/queries/_bulk_delete', {
            params: { body: { queryIds: [query.id, 'unknown-id'] } },
          })
          .expect(200)
          .then((res) => res.body);

        expect(response).to.eql({ succeeded: 1, failed: 0, skipped: 1 });
        expect((await getQueries(apiClient, STREAM_NAME)).queries).to.eql([]);
      });

      it('actually removes an already-expired query, not just from the default listing', async () => {
        // Bulk delete's existence lookup must pass includeExpired, or an expired
        // query is silently skipped instead of deleted.
        const expiredQuery = {
          id: v4(),
          title: 'already expired',
          description: '',
          esql: {
            query: `FROM ${STREAM_NAME},${STREAM_NAME}.* METADATA _id, _source | WHERE KQL("message:'expired'")`,
          },
          expires_at: '2020-01-01T00:00:00.000Z',
        };
        await bulkQueries(apiClient, STREAM_NAME, [{ index: expiredQuery }]);
        expect((await getQueries(apiClient, STREAM_NAME)).queries).to.eql([]);

        const firstDelete = await apiClient
          .fetch('POST /internal/streams/queries/_bulk_delete', {
            params: { body: { queryIds: [expiredQuery.id] } },
          })
          .expect(200)
          .then((res) => res.body);
        expect(firstDelete).to.eql({ succeeded: 1, failed: 0, skipped: 0 });

        // Repeating the delete must report skipped, proving the first call really deleted it.
        const secondDelete = await apiClient
          .fetch('POST /internal/streams/queries/_bulk_delete', {
            params: { body: { queryIds: [expiredQuery.id] } },
          })
          .expect(200)
          .then((res) => res.body);
        expect(secondDelete).to.eql({ succeeded: 0, failed: 0, skipped: 1 });
      });

      it('does not touch a surviving sibling query or its rule', async () => {
        // Regression: deleting one query used to re-diff the whole stream, spuriously
        // calling updateRule on every other rule-backed query in it.
        const survivor = {
          id: v4(),
          title: 'bulk-delete survivor',
          description: '',
          esql: {
            query: `FROM ${STREAM_NAME},${STREAM_NAME}.* METADATA _id, _source | WHERE KQL("message:'survivor'")`,
          },
        };
        const target = {
          id: v4(),
          title: 'bulk-delete target',
          description: '',
          esql: {
            query: `FROM ${STREAM_NAME},${STREAM_NAME}.* METADATA _id, _source | WHERE KQL("message:'target'")`,
          },
        };
        await bulkQueries(apiClient, STREAM_NAME, [{ index: survivor }, { index: target }]);

        const rulesBefore = await alertingApi.searchRulesV2(roleAuthc);
        const survivorRuleBefore = rulesBefore.body.items.find(
          (rule: any) => rule.metadata.name === survivor.title
        );
        expect(survivorRuleBefore).to.be.ok();

        const response = await apiClient
          .fetch('POST /internal/streams/queries/_bulk_delete', {
            params: { body: { queryIds: [target.id] } },
          })
          .expect(200)
          .then((res) => res.body);
        expect(response).to.eql({ succeeded: 1, failed: 0, skipped: 0 });

        expect((await getQueries(apiClient, STREAM_NAME)).queries).to.eql([
          { ...survivor, type: 'match' },
        ]);

        const rulesAfter = await alertingApi.searchRulesV2(roleAuthc);
        const survivorRuleAfter = rulesAfter.body.items.find(
          (rule: any) => rule.metadata.name === survivor.title
        );
        expect(survivorRuleAfter.id).to.eql(survivorRuleBefore.id);
        expect(survivorRuleAfter.updatedAt).to.eql(survivorRuleBefore.updatedAt);
        expect(survivorRuleAfter.version).to.eql(survivorRuleBefore.version);
      });
    });

    describe('feature-grounding survives unrelated query bulk operations', () => {
      const testFeature: BaseFeature = {
        id: 'reconcile-ttl-probe',
        stream_name: STREAM_NAME,
        type: 'entity',
        description: 'grounding probe for TTL-preservation regression tests',
        properties: {},
        confidence: 90,
      };

      async function persistGroundedQuery(title: string) {
        const response = await apiClient
          .fetch('POST /internal/streams/{streamName}/queries/_persist', {
            params: {
              path: { streamName: STREAM_NAME },
              body: {
                queries: [
                  {
                    type: 'match',
                    title,
                    description: '',
                    esql: {
                      query: `FROM ${STREAM_NAME},${STREAM_NAME}.* METADATA _id, _source | WHERE KQL("message:'${title}'")`,
                    },
                    severity_score: 10,
                    features: [{ id: testFeature.id }],
                  },
                ],
              },
            },
          })
          .expect(200)
          .then((res) => res.body);
        return response.persistedQueries[0].id as string;
      }

      it('reconcileStream still tombstones a survivor of the public bulk queries endpoint once its feature is gone', async () => {
        // Regression: the bulk endpoint's rewrite used to drop expires_at on unrelated
        // queries, making this survivor durable and immune to the reconciliation below.
        const { uuid: featureUuid } = await upsertFeature(apiClient, STREAM_NAME, testFeature);
        const survivorId = await persistGroundedQuery('persist-survivor-public-bulk');

        await bulkQueries(apiClient, STREAM_NAME, [
          {
            index: {
              id: v4(),
              title: 'public bulk unrelated draft',
              description: '',
              esql: {
                query: `FROM ${STREAM_NAME},${STREAM_NAME}.* METADATA _id, _source | WHERE KQL("message:'unrelated'")`,
              },
            },
          },
        ]);

        await deleteFeature(apiClient, STREAM_NAME, featureUuid);

        const { queries } = await getQueries(apiClient, STREAM_NAME);
        expect(queries.find((q) => q.id === survivorId)).to.be(undefined);
      });
    });
  });
}
