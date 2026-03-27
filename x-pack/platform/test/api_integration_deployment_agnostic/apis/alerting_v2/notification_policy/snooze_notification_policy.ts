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

  describe('Snooze Notification Policy API', function () {
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

    it('should snooze a notification policy with a future date', async () => {
      const policy = await createPolicy('test-snooze');
      const futureDate = new Date(Date.now() + 86_400_000).toISOString();

      const response = await supertestWithoutAuth
        .post(`${NOTIFICATION_POLICY_API_PATH}/${policy.id}/_snooze`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ snoozedUntil: futureDate });

      expect(response.status).to.be(200);
      expect(response.body.snoozedUntil).to.be(futureDate);
      expect(response.body.enabled).to.be(true);
    });

    it('should preserve enabled state when snoozing', async () => {
      const policy = await createPolicy('test-snooze-preserve-enabled');
      const futureDate = new Date(Date.now() + 86_400_000).toISOString();

      // Disable the policy first
      await supertestWithoutAuth
        .post(`${NOTIFICATION_POLICY_API_PATH}/${policy.id}/_disable`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader());

      // Snooze should not change enabled state
      const response = await supertestWithoutAuth
        .post(`${NOTIFICATION_POLICY_API_PATH}/${policy.id}/_snooze`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ snoozedUntil: futureDate });

      expect(response.status).to.be(200);
      expect(response.body.snoozedUntil).to.be(futureDate);
      expect(response.body.enabled).to.be(false);
    });

    it('should update snoozedUntil when snoozing an already snoozed policy', async () => {
      const policy = await createPolicy('test-snooze-overwrite');
      const firstDate = new Date(Date.now() + 86_400_000).toISOString();
      const secondDate = new Date(Date.now() + 172_800_000).toISOString();

      await supertestWithoutAuth
        .post(`${NOTIFICATION_POLICY_API_PATH}/${policy.id}/_snooze`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ snoozedUntil: firstDate });

      const response = await supertestWithoutAuth
        .post(`${NOTIFICATION_POLICY_API_PATH}/${policy.id}/_snooze`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ snoozedUntil: secondDate });

      expect(response.status).to.be(200);
      expect(response.body.snoozedUntil).to.be(secondDate);
    });

    it('should reject an invalid date format', async () => {
      const policy = await createPolicy('test-snooze-invalid-date');

      const response = await supertestWithoutAuth
        .post(`${NOTIFICATION_POLICY_API_PATH}/${policy.id}/_snooze`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ snoozedUntil: 'not-a-date' });

      expect(response.status).to.be(400);
    });

    it('should return 404 when snoozing a non-existent notification policy', async () => {
      const futureDate = new Date(Date.now() + 86_400_000).toISOString();

      const response = await supertestWithoutAuth
        .post(`${NOTIFICATION_POLICY_API_PATH}/non-existent-id/_snooze`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ snoozedUntil: futureDate });

      expect(response.status).to.be(404);
    });
  });
}
