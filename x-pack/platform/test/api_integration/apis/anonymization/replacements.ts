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
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const security = getService('security');
  const es = getService('es');

  describe('anonymization replacements', function () {
    // Helper to create a replacements document directly in ES (simulating inference runtime)
    const createReplacementsDoc = async (overrides: Record<string, unknown> = {}) => {
      const id = `test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const doc = {
        id,
        replacements: [
          {
            anonymized: 'HOST_NAME_ABC123',
            original: 'my-server-01',
          },
          {
            anonymized: 'USER_NAME_DEF456',
            original: 'alice',
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
        document: doc,
        refresh: 'wait_for',
      });

      return { id, doc };
    };

    describe('resolve and deanonymize', () => {
      it('resolves replacements by ID', async () => {
        const { id } = await createReplacementsDoc();

        const { body, status } = await supertest
          .get(`${REPLACEMENTS_API}/${id}`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', API_VERSION);

        expect(status).to.be(200);
        expect(body.id).to.be(id);
        expect(body.namespace).to.be('default');
        expect(body.replacements).to.eql([
          { anonymized: 'HOST_NAME_ABC123', original: 'my-server-01' },
          { anonymized: 'USER_NAME_DEF456', original: 'alice' },
        ]);
      });

      it('deanonymizes text using stored replacements', async () => {
        const { id } = await createReplacementsDoc();

        const { body, status } = await supertest
          .post(`${REPLACEMENTS_API}/_deanonymize`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', API_VERSION)
          .send({
            text: 'The host HOST_NAME_ABC123 was accessed by USER_NAME_DEF456',
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

    describe('authorization gating', () => {
      const username = `anon_replacements_readonly_${Date.now()}`;
      const roleName = `anon_replacements_readonly_role_${Date.now()}`;
      const password = `${username}-password`;

      before(async () => {
        await security.role.create(roleName, {
          elasticsearch: {},
          kibana: [
            {
              feature: {
                dashboard: ['read'],
              },
              spaces: ['*'],
            },
          ],
        });

        await security.user.create(username, {
          password,
          roles: [roleName],
          full_name: 'Anonymization Replacements Readonly Test User',
        });
      });

      after(async () => {
        await security.user.delete(username);
        await security.role.delete(roleName);
      });

      it('returns 403 for replacements reads without anonymization privileges', async () => {
        const { status } = await supertestWithoutAuth
          .get(`${REPLACEMENTS_API}/rbac-denied-id`)
          .auth(username, password)
          .set('kbn-xsrf', 'true')
          .set('x-elastic-internal-origin', 'kibana')
          .set('elastic-api-version', API_VERSION);

        expect(status).to.be(403);
      });
    });
  });
}
