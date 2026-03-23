/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import type { RoleCredentials } from '../../../services';

const NOTIFICATION_POLICY_API_PATH = '/internal/alerting/v2/notification_policies';
const NOTIFICATION_POLICY_SO_TYPE = 'alerting_notification_policy';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const samlAuth = getService('samlAuth');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const kibanaServer = getService('kibanaServer');

  async function createPolicy(
    roleAuthc: RoleCredentials,
    name: string,
    overrides?: {
      description?: string;
      destinations?: Array<{ type: string; id: string }>;
    }
  ) {
    return supertestWithoutAuth
      .post(NOTIFICATION_POLICY_API_PATH)
      .set(roleAuthc.apiKeyHeader)
      .set(samlAuth.getInternalRequestHeader())
      .send({
        name,
        description: overrides?.description ?? `${name} description`,
        destinations: overrides?.destinations ?? [{ type: 'workflow', id: `${name}-workflow-id` }],
      });
  }

  async function listPolicies(roleAuthc: RoleCredentials, query?: Record<string, string | number>) {
    const req = supertestWithoutAuth
      .get(NOTIFICATION_POLICY_API_PATH)
      .set(roleAuthc.apiKeyHeader)
      .set(samlAuth.getInternalRequestHeader());
    return query ? req.query(query) : req;
  }

  describe('List Notification Policies API', function () {
    let roleAuthc: RoleCredentials;

    before(async () => {
      await kibanaServer.savedObjects.clean({ types: [NOTIFICATION_POLICY_SO_TYPE] });
      roleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('admin');
    });

    after(async () => {
      await kibanaServer.savedObjects.clean({ types: [NOTIFICATION_POLICY_SO_TYPE] });
      await samlAuth.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });

    it('should return empty list when no policies exist', async () => {
      const response = await supertestWithoutAuth
        .get(NOTIFICATION_POLICY_API_PATH)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader());

      expect(response.status).to.be(200);
      expect(response.body.items).to.be.an('array');
      expect(response.body.items.length).to.be(0);
      expect(response.body.total).to.be(0);
      expect(response.body.page).to.be(1);
      expect(response.body.perPage).to.be(20);
    });

    it('should return created notification policies', async () => {
      const createResponse1 = await createPolicy(roleAuthc, 'policy-1');
      expect(createResponse1.status).to.be(200);

      const createResponse2 = await createPolicy(roleAuthc, 'policy-2');
      expect(createResponse2.status).to.be(200);

      const response = await supertestWithoutAuth
        .get(NOTIFICATION_POLICY_API_PATH)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader());

      expect(response.status).to.be(200);
      expect(response.body.items).to.be.an('array');
      expect(response.body.items.length).to.be(2);
      expect(response.body.total).to.be(2);

      const names = response.body.items.map((item: { name: string }) => item.name);
      expect(names).to.contain('policy-1');
      expect(names).to.contain('policy-2');

      for (const item of response.body.items) {
        expect(item.id).to.be.a('string');
        expect(item.name).to.be.a('string');
        expect(item.description).to.be.a('string');
        expect(item.destinations).to.be.an('array');
        expect(item.createdAt).to.be.a('string');
        expect(item.updatedAt).to.be.a('string');
        expect(item.auth).to.be.an('object');
        expect(item.auth.owner).to.be.a('string');
        expect(item.auth.createdByUser).to.be.a('boolean');
        expect(item.auth).to.not.have.property('apiKey');
      }
    });

    it('should paginate results', async () => {
      await createPolicy(roleAuthc, 'policy-3');

      const firstPage = await supertestWithoutAuth
        .get(NOTIFICATION_POLICY_API_PATH)
        .query({ page: 1, perPage: 2 })
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader());

      expect(firstPage.status).to.be(200);
      expect(firstPage.body.items.length).to.be(2);
      expect(firstPage.body.total).to.be(3);
      expect(firstPage.body.page).to.be(1);
      expect(firstPage.body.perPage).to.be(2);

      const secondPage = await supertestWithoutAuth
        .get(NOTIFICATION_POLICY_API_PATH)
        .query({ page: 2, perPage: 2 })
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader());

      expect(secondPage.status).to.be(200);
      expect(secondPage.body.items.length).to.be(1);
      expect(secondPage.body.total).to.be(3);
      expect(secondPage.body.page).to.be(2);
      expect(secondPage.body.perPage).to.be(2);
    });

    describe('search, filter, and sort', () => {
      let seedCreatedBy: string;

      before(async () => {
        await kibanaServer.savedObjects.clean({ types: [NOTIFICATION_POLICY_SO_TYPE] });

        const alphaResp = await createPolicy(roleAuthc, 'Alpha Policy', {
          description: 'Monitors CPU usage',
          destinations: [{ type: 'workflow', id: 'wf-alpha-001' }],
        });
        expect(alphaResp.status).to.be(200);
        seedCreatedBy = alphaResp.body.createdBy;

        const betaResp = await createPolicy(roleAuthc, 'Beta Policy', {
          description: 'Tracks memory alerts',
          destinations: [{ type: 'workflow', id: 'wf-beta-002' }],
        });
        expect(betaResp.status).to.be(200);

        const gammaResp = await createPolicy(roleAuthc, 'Gamma Policy', {
          description: 'Monitors disk space',
          destinations: [{ type: 'workflow', id: 'wf-gamma-003' }],
        });
        expect(gammaResp.status).to.be(200);
      });

      after(async () => {
        await kibanaServer.savedObjects.clean({ types: [NOTIFICATION_POLICY_SO_TYPE] });
      });

      describe('search', () => {
        it('should search by name', async () => {
          const response = await listPolicies(roleAuthc, { search: 'Alpha' });

          expect(response.status).to.be(200);
          expect(response.body.total).to.be(1);
          expect(response.body.items[0].name).to.be('Alpha Policy');
        });

        it('should search by description', async () => {
          const response = await listPolicies(roleAuthc, { search: 'memory' });

          expect(response.status).to.be(200);
          expect(response.body.total).to.be(1);
          expect(response.body.items[0].name).to.be('Beta Policy');
        });

        it('should search by destination id', async () => {
          const response = await listPolicies(roleAuthc, { search: 'wf-gamma' });

          expect(response.status).to.be(200);
          expect(response.body.total).to.be(1);
          expect(response.body.items[0].name).to.be('Gamma Policy');
        });

        it('should return all matching results for partial match', async () => {
          const response = await listPolicies(roleAuthc, { search: 'Monitors' });

          expect(response.status).to.be(200);
          expect(response.body.total).to.be(2);
          const names = response.body.items.map((item: { name: string }) => item.name);
          expect(names).to.contain('Alpha Policy');
          expect(names).to.contain('Gamma Policy');
        });

        it('should return empty results for non-matching search', async () => {
          const response = await listPolicies(roleAuthc, { search: 'nonexistent' });

          expect(response.status).to.be(200);
          expect(response.body.total).to.be(0);
          expect(response.body.items.length).to.be(0);
        });
      });

      describe('filter', () => {
        it('should filter by destination type', async () => {
          const response = await listPolicies(roleAuthc, { destinationType: 'workflow' });

          expect(response.status).to.be(200);
          expect(response.body.total).to.be(3);
        });

        it('should filter by destination type with no matches', async () => {
          const response = await listPolicies(roleAuthc, { destinationType: 'email' });

          expect(response.status).to.be(200);
          expect(response.body.total).to.be(0);
          expect(response.body.items.length).to.be(0);
        });

        it('should filter by createdBy', async () => {
          const response = await listPolicies(roleAuthc, { createdBy: seedCreatedBy });

          expect(response.status).to.be(200);
          expect(response.body.total).to.be(3);
        });
      });

      describe('sort', () => {
        it('should sort by name ascending', async () => {
          const response = await listPolicies(roleAuthc, {
            sortField: 'name',
            sortOrder: 'asc',
          });

          expect(response.status).to.be(200);
          expect(response.body.items.length).to.be(3);
          expect(response.body.items[0].name).to.be('Alpha Policy');
          expect(response.body.items[1].name).to.be('Beta Policy');
          expect(response.body.items[2].name).to.be('Gamma Policy');
        });

        it('should sort by name descending', async () => {
          const response = await listPolicies(roleAuthc, {
            sortField: 'name',
            sortOrder: 'desc',
          });

          expect(response.status).to.be(200);
          expect(response.body.items.length).to.be(3);
          expect(response.body.items[0].name).to.be('Gamma Policy');
          expect(response.body.items[1].name).to.be('Beta Policy');
          expect(response.body.items[2].name).to.be('Alpha Policy');
        });

        it('should sort by createdAt ascending', async () => {
          const response = await listPolicies(roleAuthc, {
            sortField: 'createdAt',
            sortOrder: 'asc',
          });

          expect(response.status).to.be(200);
          expect(response.body.items.length).to.be(3);
          expect(response.body.items[0].name).to.be('Alpha Policy');
          expect(response.body.items[2].name).to.be('Gamma Policy');
        });

        it('should sort by createdAt descending', async () => {
          const response = await listPolicies(roleAuthc, {
            sortField: 'createdAt',
            sortOrder: 'desc',
          });

          expect(response.status).to.be(200);
          expect(response.body.items.length).to.be(3);
          expect(response.body.items[0].name).to.be('Gamma Policy');
          expect(response.body.items[2].name).to.be('Alpha Policy');
        });
      });

      describe('combined search, filter, and sort', () => {
        it('should combine search with sort', async () => {
          const response = await listPolicies(roleAuthc, {
            search: 'Monitors',
            sortField: 'name',
            sortOrder: 'asc',
          });

          expect(response.status).to.be(200);
          expect(response.body.total).to.be(2);
          expect(response.body.items[0].name).to.be('Alpha Policy');
          expect(response.body.items[1].name).to.be('Gamma Policy');
        });

        it('should combine search with pagination', async () => {
          const response = await listPolicies(roleAuthc, {
            search: 'Policy',
            perPage: 2,
            page: 1,
          });

          expect(response.status).to.be(200);
          expect(response.body.total).to.be(3);
          expect(response.body.items.length).to.be(2);
          expect(response.body.page).to.be(1);
          expect(response.body.perPage).to.be(2);
        });
      });
    });
  });
}
