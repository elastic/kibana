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

  describe('Bulk Action Notification Policies API', function () {
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

    async function getPolicy(id: string) {
      const response = await supertestWithoutAuth
        .get(`${NOTIFICATION_POLICY_API_PATH}/${id}`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader());

      expect(response.status).to.be(200);
      return response.body;
    }

    async function disablePolicy(id: string) {
      const response = await supertestWithoutAuth
        .post(`${NOTIFICATION_POLICY_API_PATH}/${id}/_disable`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader());

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

    async function bulkAction(actions: Array<Record<string, unknown>>) {
      return supertestWithoutAuth
        .post(`${NOTIFICATION_POLICY_API_PATH}/_bulk`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ actions });
    }

    it('should bulk enable disabled policies', async () => {
      const p1 = await createPolicy('bulk-enable-1');
      const p2 = await createPolicy('bulk-enable-2');
      await disablePolicy(p1.id);
      await disablePolicy(p2.id);

      const response = await bulkAction([
        { id: p1.id, action: 'enable' },
        { id: p2.id, action: 'enable' },
      ]);

      expect(response.status).to.be(200);
      expect(response.body.processed).to.be(2);
      expect(response.body.total).to.be(2);
      expect(response.body.errors).to.have.length(0);

      const updated1 = await getPolicy(p1.id);
      const updated2 = await getPolicy(p2.id);
      expect(updated1.enabled).to.be(true);
      expect(updated2.enabled).to.be(true);
    });

    it('should bulk disable enabled policies', async () => {
      const p1 = await createPolicy('bulk-disable-1');
      const p2 = await createPolicy('bulk-disable-2');

      const response = await bulkAction([
        { id: p1.id, action: 'disable' },
        { id: p2.id, action: 'disable' },
      ]);

      expect(response.status).to.be(200);
      expect(response.body.processed).to.be(2);

      const updated1 = await getPolicy(p1.id);
      const updated2 = await getPolicy(p2.id);
      expect(updated1.enabled).to.be(false);
      expect(updated2.enabled).to.be(false);
    });

    it('should bulk snooze policies', async () => {
      const p1 = await createPolicy('bulk-snooze-1');
      const p2 = await createPolicy('bulk-snooze-2');
      const futureDate = new Date(Date.now() + 86_400_000).toISOString();

      const response = await bulkAction([
        { id: p1.id, action: 'snooze', snoozed_until: futureDate },
        { id: p2.id, action: 'snooze', snoozed_until: futureDate },
      ]);

      expect(response.status).to.be(200);
      expect(response.body.processed).to.be(2);

      const updated1 = await getPolicy(p1.id);
      const updated2 = await getPolicy(p2.id);
      expect(updated1.snoozedUntil).to.be(futureDate);
      expect(updated2.snoozedUntil).to.be(futureDate);
    });

    it('should bulk unsnooze snoozed policies', async () => {
      const p1 = await createPolicy('bulk-unsnooze-1');
      const p2 = await createPolicy('bulk-unsnooze-2');
      const futureDate = new Date(Date.now() + 86_400_000).toISOString();
      await snoozePolicy(p1.id, futureDate);
      await snoozePolicy(p2.id, futureDate);

      const response = await bulkAction([
        { id: p1.id, action: 'unsnooze' },
        { id: p2.id, action: 'unsnooze' },
      ]);

      expect(response.status).to.be(200);
      expect(response.body.processed).to.be(2);

      const updated1 = await getPolicy(p1.id);
      const updated2 = await getPolicy(p2.id);
      expect(updated1.snoozedUntil).to.be(null);
      expect(updated2.snoozedUntil).to.be(null);
    });

    it('should handle mixed actions in a single request', async () => {
      const pEnable = await createPolicy('bulk-mixed-enable');
      const pDisable = await createPolicy('bulk-mixed-disable');
      const pSnooze = await createPolicy('bulk-mixed-snooze');
      const pUnsnooze = await createPolicy('bulk-mixed-unsnooze');

      await disablePolicy(pEnable.id);
      const futureDate = new Date(Date.now() + 86_400_000).toISOString();
      await snoozePolicy(pUnsnooze.id, futureDate);

      const response = await bulkAction([
        { id: pEnable.id, action: 'enable' },
        { id: pDisable.id, action: 'disable' },
        { id: pSnooze.id, action: 'snooze', snoozed_until: futureDate },
        { id: pUnsnooze.id, action: 'unsnooze' },
      ]);

      expect(response.status).to.be(200);
      expect(response.body.processed).to.be(4);
      expect(response.body.total).to.be(4);
      expect(response.body.errors).to.have.length(0);

      const updatedEnable = await getPolicy(pEnable.id);
      const updatedDisable = await getPolicy(pDisable.id);
      const updatedSnooze = await getPolicy(pSnooze.id);
      const updatedUnsnooze = await getPolicy(pUnsnooze.id);

      expect(updatedEnable.enabled).to.be(true);
      expect(updatedDisable.enabled).to.be(false);
      expect(updatedSnooze.snoozedUntil).to.be(futureDate);
      expect(updatedUnsnooze.snoozedUntil).to.be(null);
    });

    it('should return errors for non-existent policies', async () => {
      const existing = await createPolicy('bulk-partial-failure');

      const response = await bulkAction([
        { id: existing.id, action: 'enable' },
        { id: 'non-existent-id', action: 'disable' },
      ]);

      expect(response.status).to.be(200);
      expect(response.body.total).to.be(2);
      expect(response.body.processed).to.be(1);
      expect(response.body.errors).to.have.length(1);
      expect(response.body.errors[0].id).to.be('non-existent-id');
    });

    it('should return 400 when actions array is empty', async () => {
      const response = await bulkAction([]);

      expect(response.status).to.be(400);
    });
  });
}
