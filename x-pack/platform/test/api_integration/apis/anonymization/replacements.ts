/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../ftr_provider_context';

const REPLACEMENTS_API = '/internal/inference/anonymization/replacements';
const API_VERSION = '1';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const security = getService('security');

  describe('anonymization replacements', function () {
    // The anonymization feature is disabled (ANONYMIZATION_FEATURE_ACTIVE = false).
    // The replacements plugin reads encryption key from the anonymization policy service,
    // which returns undefined when disabled, causing a 400 response.
    // RBAC is still enforced (403 for missing privileges).

    describe('feature disabled — replacements endpoints return 400', () => {
      it('GET replacements by ID returns 400', async () => {
        const { status } = await supertest
          .get(`${REPLACEMENTS_API}/any-id`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', API_VERSION);

        expect(status).to.be(400);
      });

      it('POST _deanonymize returns 400', async () => {
        const { status } = await supertest
          .post(`${REPLACEMENTS_API}/_deanonymize`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', API_VERSION)
          .send({
            text: 'some text HOST_NAME_ABC123',
            replacementsId: 'any-id',
          });

        expect(status).to.be(400);
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
