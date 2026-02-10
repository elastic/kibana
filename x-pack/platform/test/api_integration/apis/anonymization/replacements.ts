/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../ftr_provider_context';

const REPLACEMENTS_API = '/internal/inference/anonymization/replacements';
const REPLACEMENTS_INDEX = '.kibana-anonymization-replacements';
const API_VERSION = '1';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('anonymization replacements', function () {
    // Helper to create a replacements document directly in ES (simulating inference runtime)
    const createReplacementsDoc = async (overrides: Record<string, unknown> = {}) => {
      const id = `test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const doc = {
        id,
        scope_type: 'execution',
        scope_id: `exec-${id}`,
        profile_id: 'profile-test',
        token_to_original: {
          HOST_NAME_abc123: 'my-server-01',
          USER_NAME_def456: 'alice',
        },
        token_sources: [
          {
            token: 'HOST_NAME_abc123',
            pointer: '/kibana.alert.host.name',
            entity_class: 'HOST_NAME',
            source_type: 'test',
            source_id: id,
          },
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: 'test',
        namespace: 'default',
        ...overrides,
      };

      await es.index({
        index: REPLACEMENTS_INDEX,
        id,
        body: doc,
        refresh: 'wait_for',
      });

      return { id, doc };
    };

    // ---------------------------------------------------------------
    // 1.34: Resolve/deanonymize API
    // ---------------------------------------------------------------
    describe('resolve and deanonymize', () => {
      it('resolves replacements by ID', async () => {
        const { id } = await createReplacementsDoc();

        const { body, status } = await supertest
          .get(`${REPLACEMENTS_API}/${id}`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', API_VERSION);

        expect(status).to.be(200);
        expect(body.id).to.be(id);
        expect(body.tokenToOriginal).to.have.property('HOST_NAME_abc123', 'my-server-01');
        expect(body.tokenToOriginal).to.have.property('USER_NAME_def456', 'alice');
      });

      it('resolves replacements by scope', async () => {
        const scopeId = `scope-${Date.now()}`;
        const { id } = await createReplacementsDoc({ scope_id: scopeId });

        const { body, status } = await supertest
          .get(`${REPLACEMENTS_API}/_by_scope?type=execution&id=${scopeId}&profile_id=profile-test`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', API_VERSION);

        expect(status).to.be(200);
        expect(body.id).to.be(id);
        expect(body.scopeId).to.be(scopeId);
      });

      it('deanonymizes text using stored replacements', async () => {
        const { id } = await createReplacementsDoc();

        const { body, status } = await supertest
          .post(`${REPLACEMENTS_API}/_deanonymize`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', API_VERSION)
          .send({
            text: 'The host HOST_NAME_abc123 was accessed by USER_NAME_def456',
            replacementsId: id,
          });

        expect(status).to.be(200);
        expect(body.text).to.be('The host my-server-01 was accessed by alice');
      });

      it('returns 404 for non-existent replacements', async () => {
        const { status } = await supertest
          .get(`${REPLACEMENTS_API}/non-existent-id`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', API_VERSION);

        expect(status).to.be(404);
      });
    });

    // ---------------------------------------------------------------
    // 1.36: Space isolation
    // ---------------------------------------------------------------
    describe('space isolation', () => {
      it('returns 404 for replacements from a different namespace', async () => {
        const { id } = await createReplacementsDoc({ namespace: 'other-space' });

        const { status } = await supertest
          .get(`${REPLACEMENTS_API}/${id}`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', API_VERSION);

        // Default space request should not see other-space data
        expect(status).to.be(404);
      });
    });

    // ---------------------------------------------------------------
    // 1.37: Import/merge
    // ---------------------------------------------------------------
    describe('import and merge', () => {
      it('imports compatible replacements successfully', async () => {
        const source = await createReplacementsDoc({
          scope_id: 'exec-source',
          token_to_original: { HOST_NAME_source: 'source-host' },
        });
        const dest = await createReplacementsDoc({
          scope_id: 'thread-dest',
          scope_type: 'thread',
          token_to_original: { USER_NAME_dest: 'dest-user' },
        });

        const { body, status } = await supertest
          .post(`${REPLACEMENTS_API}/_import`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', API_VERSION)
          .send({
            sourceId: source.id,
            destinationId: dest.id,
          });

        expect(status).to.be(200);
        expect(body.merged).to.be(true);
      });

      it('rejects import when profile_id differs', async () => {
        const source = await createReplacementsDoc({
          scope_id: 'exec-src-incomp',
          profile_id: 'profile-A',
        });
        const dest = await createReplacementsDoc({
          scope_id: 'thread-dest-incomp',
          profile_id: 'profile-B',
        });

        const { status } = await supertest
          .post(`${REPLACEMENTS_API}/_import`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', API_VERSION)
          .send({
            sourceId: source.id,
            destinationId: dest.id,
          });

        expect(status).to.be(409);
      });

      it('rejects import on token_to_original conflict', async () => {
        const source = await createReplacementsDoc({
          scope_id: 'exec-src-conflict',
          token_to_original: { SHARED_TOKEN: 'value-from-source' },
        });
        const dest = await createReplacementsDoc({
          scope_id: 'thread-dest-conflict',
          token_to_original: { SHARED_TOKEN: 'different-value-in-dest' },
        });

        const { status } = await supertest
          .post(`${REPLACEMENTS_API}/_import`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', API_VERSION)
          .send({
            sourceId: source.id,
            destinationId: dest.id,
          });

        expect(status).to.be(409);
      });
    });
  });
}
