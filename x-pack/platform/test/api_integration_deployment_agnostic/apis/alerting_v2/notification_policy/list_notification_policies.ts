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

  async function createPolicy(roleAuthc: RoleCredentials, name: string) {
    return supertestWithoutAuth
      .post(NOTIFICATION_POLICY_API_PATH)
      .set(roleAuthc.apiKeyHeader)
      .set(samlAuth.getInternalRequestHeader())
      .send({
        name,
        description: `${name} description`,
        destinations: [{ type: 'workflow', id: `${name}-workflow-id` }],
      });
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
  });
}
