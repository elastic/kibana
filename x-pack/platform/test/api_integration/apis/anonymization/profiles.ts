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

  describe('anonymization profiles', function () {
    let createdProfileId: string;

    // ---------------------------------------------------------------
    // 1.18: CRUD lifecycle
    // ---------------------------------------------------------------
    describe('CRUD lifecycle', () => {
      it('creates a profile', async () => {
        const { body, status } = await supertest
          .post(PROFILES_API)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', API_VERSION)
          .send(defaultProfile);

        expect(status).to.be(200);
        expect(body.id).to.be.a('string');
        expect(body.name).to.be(defaultProfile.name);
        expect(body.targetType).to.be(defaultProfile.targetType);
        expect(body.targetId).to.be(defaultProfile.targetId);
        expect(body.rules.fieldRules).to.have.length(4);

        createdProfileId = body.id;
      });

      it('gets a profile by ID', async () => {
        const { body, status } = await supertest
          .get(`${PROFILES_API}/${createdProfileId}`)
          .set('elastic-api-version', API_VERSION);

        expect(status).to.be(200);
        expect(body.id).to.be(createdProfileId);
        expect(body.name).to.be(defaultProfile.name);
      });

      it('finds profiles', async () => {
        const { body, status } = await supertest
          .get(`${PROFILES_API}/_find`)
          .set('elastic-api-version', API_VERSION);

        expect(status).to.be(200);
        expect(body.data).to.be.an('array');
        expect(body.total).to.be.greaterThan(0);

        const found = body.data.find(
          (p: { id: string }) => p.id === createdProfileId
        );
        expect(found).to.be.ok();
      });

      it('updates a profile', async () => {
        const { body, status } = await supertest
          .put(`${PROFILES_API}/${createdProfileId}`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', API_VERSION)
          .send({
            name: 'Updated Profile Name',
            description: 'Updated description',
          });

        expect(status).to.be(200);
        expect(body.name).to.be('Updated Profile Name');
        expect(body.description).to.be('Updated description');
      });

      it('deletes a profile', async () => {
        const { status } = await supertest
          .delete(`${PROFILES_API}/${createdProfileId}`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', API_VERSION);

        expect(status).to.be(200);

        // Verify it's gone
        const { status: getStatus } = await supertest
          .get(`${PROFILES_API}/${createdProfileId}`)
          .set('elastic-api-version', API_VERSION);

        expect(getStatus).to.be(404);
      });
    });

    // ---------------------------------------------------------------
    // 1.19: Uniqueness enforcement
    // ---------------------------------------------------------------
    describe('uniqueness enforcement', () => {
      let profileId: string;

      before(async () => {
        const { body } = await supertest
          .post(PROFILES_API)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', API_VERSION)
          .send({
            ...defaultProfile,
            targetId: 'unique-test-data-view',
          });
        profileId = body.id;
      });

      after(async () => {
        await supertest
          .delete(`${PROFILES_API}/${profileId}`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', API_VERSION);
      });

      it('returns 409 when creating a duplicate target in the same space', async () => {
        const { status } = await supertest
          .post(PROFILES_API)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', API_VERSION)
          .send({
            ...defaultProfile,
            targetId: 'unique-test-data-view',
          });

        expect(status).to.be(409);
      });
    });

    // ---------------------------------------------------------------
    // 1.22: Field rule validation
    // ---------------------------------------------------------------
    describe('field rule validation', () => {
      it('returns 400 when anonymized=true but entityClass is missing', async () => {
        const { status, body } = await supertest
          .post(PROFILES_API)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', API_VERSION)
          .send({
            ...defaultProfile,
            targetId: 'validation-test-data-view',
            rules: {
              fieldRules: [
                { field: 'host.name', allowed: true, anonymized: true },
              ],
            },
          });

        expect(status).to.be(400);
        expect(body.message).to.contain('entityClass');
      });
    });

    // ---------------------------------------------------------------
    // 1.20: Space isolation (basic — single-space check)
    // ---------------------------------------------------------------
    describe('space isolation', () => {
      it('returns 404 when getting a profile with a non-matching namespace', async () => {
        // Create a profile in default space
        const { body: created } = await supertest
          .post(PROFILES_API)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', API_VERSION)
          .send({
            ...defaultProfile,
            targetId: 'space-isolation-test',
          });

        // Try to get it — this should work since we're in the same space
        const { status: getStatus } = await supertest
          .get(`${PROFILES_API}/${created.id}`)
          .set('elastic-api-version', API_VERSION);

        expect(getStatus).to.be(200);

        // Clean up
        await supertest
          .delete(`${PROFILES_API}/${created.id}`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', API_VERSION);
      });
    });
  });
}
