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

  describe('Unsnooze Notification Policy API', function () {
    let roleAuthc: RoleCredentials;

    before(async () => {
      await kibanaServer.savedObjects.clean({ types: [NOTIFICATION_POLICY_SO_TYPE] });
      roleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('admin');
    });

    after(async () => {
      await kibanaServer.savedObjects.clean({ types: [NOTIFICATION_POLICY_SO_TYPE] });
      await samlAuth.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });

    async function createPolicy(name: string) {
      const response = await supertestWithoutAuth
        .post(NOTIFICATION_POLICY_API_PATH)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          name,
          description: `${name} description`,
          destinations: [{ type: 'workflow', id: `${name}-workflow-id` }],
        });

      expect(response.status).to.be(200);
      return response.body;
    }

    async function snoozePolicy(id: string, snoozedUntil: string) {
      const response = await supertestWithoutAuth
        .post(`${NOTIFICATION_POLICY_API_PATH}/${id}/_snooze`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ snoozed_until: snoozedUntil });

      expect(response.status).to.be(200);
      return response.body;
    }

    it('should unsnooze a snoozed notification policy', async () => {
      const policy = await createPolicy('test-unsnooze');
      const futureDate = new Date(Date.now() + 86_400_000).toISOString();
      await snoozePolicy(policy.id, futureDate);

      const response = await supertestWithoutAuth
        .post(`${NOTIFICATION_POLICY_API_PATH}/${policy.id}/_unsnooze`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader());

      expect(response.status).to.be(200);
      expect(response.body.snoozedUntil).to.be(null);
      expect(response.body.enabled).to.be(true);
    });

    it('should preserve enabled state when unsnoozing a disabled policy', async () => {
      const policy = await createPolicy('test-unsnooze-disabled');
      const futureDate = new Date(Date.now() + 86_400_000).toISOString();
      await snoozePolicy(policy.id, futureDate);

      // Disable the policy
      await supertestWithoutAuth
        .post(`${NOTIFICATION_POLICY_API_PATH}/${policy.id}/_disable`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader());

      // Unsnooze should not change enabled state
      const response = await supertestWithoutAuth
        .post(`${NOTIFICATION_POLICY_API_PATH}/${policy.id}/_unsnooze`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader());

      expect(response.status).to.be(200);
      expect(response.body.snoozedUntil).to.be(null);
      expect(response.body.enabled).to.be(false);
    });

    it('should unsnooze an already unsnoozed notification policy', async () => {
      const policy = await createPolicy('test-unsnooze-noop');

      const response = await supertestWithoutAuth
        .post(`${NOTIFICATION_POLICY_API_PATH}/${policy.id}/_unsnooze`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader());

      expect(response.status).to.be(200);
      expect(response.body.snoozedUntil).to.be(null);
    });

    it('should return 404 when unsnoozing a non-existent notification policy', async () => {
      const response = await supertestWithoutAuth
        .post(`${NOTIFICATION_POLICY_API_PATH}/non-existent-id/_unsnooze`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader());

      expect(response.status).to.be(404);
    });
  });
}
