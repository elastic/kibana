/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../ftr_provider_context';

const PROFILES_API = '/internal/anonymization/profiles';
const API_VERSION = '1';

const defaultProfile = {
  name: 'Test Anonymization Profile',
  description: 'Test profile for FTR',
  targetType: 'data_view' as const,
  targetId: 'test-data-view-001',
  rules: {
    fieldRules: [
      { field: 'host.name', allowed: true, anonymized: true, entityClass: 'HOST_NAME' },
      { field: 'user.name', allowed: true, anonymized: true, entityClass: 'USER_NAME' },
      { field: '@timestamp', allowed: true, anonymized: false },
      { field: 'financial.transaction_id', allowed: false, anonymized: false },
    ],
  },
};

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const security = getService('security');

  describe('anonymization profiles', function () {
    // The anonymization feature is disabled (ANONYMIZATION_FEATURE_ACTIVE = false).
    // All profile endpoints return 404. RBAC is still enforced (403 for missing privileges).

    describe('feature disabled — profile endpoints return 404', () => {
      it('POST profile returns 404', async () => {
        const { status } = await supertest
          .post(PROFILES_API)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', API_VERSION)
          .send(defaultProfile);

        expect(status).to.be(404);
      });

      it('GET profile by ID returns 404', async () => {
        const { status } = await supertest
          .get(`${PROFILES_API}/any-id`)
          .set('elastic-api-version', API_VERSION);

        expect(status).to.be(404);
      });

      it('GET _find returns 404', async () => {
        const { status } = await supertest
          .get(`${PROFILES_API}/_find`)
          .set('elastic-api-version', API_VERSION);

        expect(status).to.be(404);
      });

      it('PUT profile returns 404', async () => {
        const { status } = await supertest
          .put(`${PROFILES_API}/any-id`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', API_VERSION)
          .send({ name: 'Updated' });

        expect(status).to.be(404);
      });

      it('DELETE profile returns 404', async () => {
        const { status } = await supertest
          .delete(`${PROFILES_API}/any-id`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', API_VERSION);

        expect(status).to.be(404);
      });
    });

    describe('RBAC enforcement', () => {
      const username = `anon_profiles_readonly_${Date.now()}`;
      const roleName = `anon_profiles_readonly_role_${Date.now()}`;
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
          full_name: 'Anonymization Profiles Readonly Test User',
        });
      });

      after(async () => {
        await security.user.delete(username);
        await security.role.delete(roleName);
      });

      it('returns 403 for profile reads without anonymization privileges', async () => {
        const { status } = await supertestWithoutAuth
          .get(`${PROFILES_API}/_find`)
          .auth(username, password)
          .set('kbn-xsrf', 'true')
          .set('x-elastic-internal-origin', 'kibana')
          .set('elastic-api-version', API_VERSION);

        expect(status).to.be(403);
      });

      it('returns 403 for profile writes without anonymization privileges', async () => {
        const { status } = await supertestWithoutAuth
          .post(PROFILES_API)
          .auth(username, password)
          .set('kbn-xsrf', 'true')
          .set('x-elastic-internal-origin', 'kibana')
          .set('elastic-api-version', API_VERSION)
          .send({
            ...defaultProfile,
            targetId: `rbac-denied-target-${Date.now()}`,
          });

        expect(status).to.be(403);
      });
    });
  });
}
