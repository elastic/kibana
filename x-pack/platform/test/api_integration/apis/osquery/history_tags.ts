/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { v4 as uuidv4 } from 'uuid';
import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('es');
  const osqueryPublicApiVersion = '2023-10-31';
  const osqueryInternalApiVersion = '1';

  const actionIndex = '.logs-osquery_manager.actions-default';

  const createActionDoc = async (overrides: Record<string, unknown> = {}) => {
    const actionId = uuidv4();

    await es.index({
      index: actionIndex,
      refresh: 'wait_for',
      document: {
        action_id: actionId,
        '@timestamp': new Date().toISOString(),
        expiration: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        type: 'INPUT_ACTION',
        input_type: 'osquery',
        space_id: 'default',
        agent_selection: { all: true },
        agents: ['test-agent-1'],
        user_id: 'elastic',
        queries: [
          {
            action_id: uuidv4(),
            id: 'query-1',
            query: 'select 1;',
            agents: ['test-agent-1'],
          },
        ],
        ...overrides,
      },
    });

    return actionId;
  };

  const deleteActionDoc = async (actionId: string) => {
    await es.deleteByQuery({
      index: actionIndex,
      allow_no_indices: true,
      ignore_unavailable: true,
      refresh: true,
      query: { term: { action_id: actionId } },
    });
  };

  describe('History tags', () => {
    const actionIds: string[] = [];

    after(async () => {
      for (const id of actionIds) {
        await deleteActionDoc(id);
      }
    });

    describe('PUT /api/osquery/history/{id}/tags', () => {
      it('updates tags on an existing action', async () => {
        const actionId = await createActionDoc();
        actionIds.push(actionId);

        const response = await supertest
          .put(`/api/osquery/history/${actionId}/tags`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', osqueryPublicApiVersion)
          .send({ tags: ['important', 'reviewed'] });

        expect(response.status).to.be(200);
        expect(response.body.data.tags).to.eql(['important', 'reviewed']);
      });

      it('replaces existing tags with new set', async () => {
        const actionId = await createActionDoc({ tags: ['old-tag'] });
        actionIds.push(actionId);

        const response = await supertest
          .put(`/api/osquery/history/${actionId}/tags`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', osqueryPublicApiVersion)
          .send({ tags: ['new-tag-1', 'new-tag-2'] });

        expect(response.status).to.be(200);
        expect(response.body.data.tags).to.eql(['new-tag-1', 'new-tag-2']);
      });

      it('clears tags when empty array is sent', async () => {
        const actionId = await createActionDoc({ tags: ['to-remove'] });
        actionIds.push(actionId);

        const response = await supertest
          .put(`/api/osquery/history/${actionId}/tags`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', osqueryPublicApiVersion)
          .send({ tags: [] });

        expect(response.status).to.be(200);
        expect(response.body.data.tags).to.eql([]);
      });

      it('returns 404 for non-existent action', async () => {
        const response = await supertest
          .put('/api/osquery/history/non-existent-id/tags')
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', osqueryPublicApiVersion)
          .send({ tags: ['test'] });

        expect(response.status).to.be(404);
      });

      it('rejects more than 20 tags', async () => {
        const actionId = await createActionDoc();
        actionIds.push(actionId);

        const tooManyTags = Array.from({ length: 21 }, (_, i) => `tag-${i}`);
        const response = await supertest
          .put(`/api/osquery/history/${actionId}/tags`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', osqueryPublicApiVersion)
          .send({ tags: tooManyTags });

        expect(response.status).to.be(400);
      });

      it('rejects empty string tags', async () => {
        const actionId = await createActionDoc();
        actionIds.push(actionId);

        const response = await supertest
          .put(`/api/osquery/history/${actionId}/tags`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', osqueryPublicApiVersion)
          .send({ tags: ['valid', ''] });

        expect(response.status).to.be(400);
      });

      it('rejects tags exceeding 256 characters', async () => {
        const actionId = await createActionDoc();
        actionIds.push(actionId);

        const longTag = 'a'.repeat(257);
        const response = await supertest
          .put(`/api/osquery/history/${actionId}/tags`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', osqueryPublicApiVersion)
          .send({ tags: [longTag] });

        expect(response.status).to.be(400);
      });

      it('deduplicates tags before persisting', async () => {
        const actionId = await createActionDoc();
        actionIds.push(actionId);

        const response = await supertest
          .put(`/api/osquery/history/${actionId}/tags`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', osqueryPublicApiVersion)
          .send({ tags: ['dup', 'dup', 'unique'] });

        expect(response.status).to.be(200);
        expect(response.body.data.tags).to.eql(['dup', 'unique']);
      });

      it('accepts exactly 20 tags', async () => {
        const actionId = await createActionDoc();
        actionIds.push(actionId);

        const maxTags = Array.from({ length: 20 }, (_, i) => `tag-${i}`);
        const response = await supertest
          .put(`/api/osquery/history/${actionId}/tags`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', osqueryPublicApiVersion)
          .send({ tags: maxTags });

        expect(response.status).to.be(200);
        expect(response.body.data.tags).to.eql(maxTags);
      });

      it('accepts a tag at exactly 256 characters', async () => {
        const actionId = await createActionDoc();
        actionIds.push(actionId);

        const maxLengthTag = 'a'.repeat(256);
        const response = await supertest
          .put(`/api/osquery/history/${actionId}/tags`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', osqueryPublicApiVersion)
          .send({ tags: [maxLengthTag] });

        expect(response.status).to.be(200);
        expect(response.body.data.tags).to.eql([maxLengthTag]);
      });

      it('updated tags are visible via details API', async () => {
        const actionId = await createActionDoc();
        actionIds.push(actionId);

        await supertest
          .put(`/api/osquery/history/${actionId}/tags`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', osqueryPublicApiVersion)
          .send({ tags: ['round-trip'] })
          .expect(200);

        const detailsResponse = await supertest
          .get(`/api/osquery/live_queries/${actionId}`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', osqueryPublicApiVersion);

        expect(detailsResponse.status).to.be(200);
        expect(detailsResponse.body.data.tags).to.eql(['round-trip']);
      });

      it('rejects request with missing tags field', async () => {
        const actionId = await createActionDoc();
        actionIds.push(actionId);

        const response = await supertest
          .put(`/api/osquery/history/${actionId}/tags`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', osqueryPublicApiVersion)
          .send({});

        expect(response.status).to.be(400);
      });

      it('rejects request with non-array tags', async () => {
        const actionId = await createActionDoc();
        actionIds.push(actionId);

        const response = await supertest
          .put(`/api/osquery/history/${actionId}/tags`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', osqueryPublicApiVersion)
          .send({ tags: 'not-an-array' });

        expect(response.status).to.be(400);
      });

      it('rejects request with non-string tag values', async () => {
        const actionId = await createActionDoc();
        actionIds.push(actionId);

        const response = await supertest
          .put(`/api/osquery/history/${actionId}/tags`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', osqueryPublicApiVersion)
          .send({ tags: [123, true] });

        expect(response.status).to.be(400);
      });

      it('updated tags appear in the tags aggregation', async () => {
        const actionId = await createActionDoc();
        actionIds.push(actionId);

        await supertest
          .put(`/api/osquery/history/${actionId}/tags`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', osqueryPublicApiVersion)
          .send({ tags: ['agg-test-unique'] })
          .expect(200);

        const tagsResponse = await supertest
          .get('/internal/osquery/history/tags')
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', osqueryInternalApiVersion);

        expect(tagsResponse.status).to.be(200);
        expect(tagsResponse.body.data).to.contain('agg-test-unique');
      });
    });

    describe('GET /internal/osquery/history/tags', () => {
      it('returns unique tags from existing actions', async () => {
        const id1 = await createActionDoc({ tags: ['alpha', 'beta'] });
        const id2 = await createActionDoc({ tags: ['beta', 'gamma'] });
        actionIds.push(id1, id2);

        const response = await supertest
          .get('/internal/osquery/history/tags')
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', osqueryInternalApiVersion);

        expect(response.status).to.be(200);
        expect(response.body.data).to.be.an('array');
        expect(response.body.data).to.contain('alpha');
        expect(response.body.data).to.contain('beta');
        expect(response.body.data).to.contain('gamma');
      });

      it('returns a valid array response', async () => {
        const response = await supertest
          .get('/internal/osquery/history/tags')
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', osqueryInternalApiVersion);

        expect(response.status).to.be(200);
        expect(response.body.data).to.be.an('array');
      });
    });

    describe('tags in live query details', () => {
      it('returns tags in the details response', async () => {
        const actionId = await createActionDoc({ tags: ['detail-tag'] });
        actionIds.push(actionId);

        const response = await supertest
          .get(`/api/osquery/live_queries/${actionId}`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', osqueryPublicApiVersion);

        expect(response.status).to.be(200);
        expect(response.body.data.tags).to.eql(['detail-tag']);
      });

      it('returns undefined tags for actions without tags', async () => {
        const actionId = await createActionDoc();
        actionIds.push(actionId);

        const response = await supertest
          .get(`/api/osquery/live_queries/${actionId}`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', osqueryPublicApiVersion);

        expect(response.status).to.be(200);
        expect(response.body.data.tags).to.be(undefined);
      });
    });
  });
}
