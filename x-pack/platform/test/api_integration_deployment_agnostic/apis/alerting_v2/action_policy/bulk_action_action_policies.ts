/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import type { RoleCredentials } from '../../../services';

const ACTION_POLICY_API_PATH = '/api/alerting/v2/action_policies';
const ACTION_POLICY_SO_TYPE = 'alerting_action_policy';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const samlAuth = getService('samlAuth');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const kibanaServer = getService('kibanaServer');

  describe('Bulk Action Action Policies API', function () {
    let roleAuthc: RoleCredentials;

    before(async () => {
      await kibanaServer.savedObjects.clean({ types: [ACTION_POLICY_SO_TYPE] });
      roleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('admin');
    });

    after(async () => {
      await kibanaServer.savedObjects.clean({ types: [ACTION_POLICY_SO_TYPE] });
      await samlAuth.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });

    async function createPolicy(name: string) {
      const response = await supertestWithoutAuth
        .post(ACTION_POLICY_API_PATH)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          name,
          description: `${name} description`,
          destinations: [{ type: 'workflow', id: `${name}-workflow-id` }],
        });

      expect(response.status).to.be(201);
      return response.body;
    }

    async function getPolicy(id: string) {
      const response = await supertestWithoutAuth
        .get(`${ACTION_POLICY_API_PATH}/${id}`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader());

      expect(response.status).to.be(200);
      return response.body;
    }

    async function disablePolicy(id: string) {
      const response = await supertestWithoutAuth
        .post(`${ACTION_POLICY_API_PATH}/${id}/_disable`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader());

      expect(response.status).to.be(200);
      return response.body;
    }

    async function snoozePolicy(id: string, snoozedUntil: string) {
      const response = await supertestWithoutAuth
        .post(`${ACTION_POLICY_API_PATH}/${id}/_snooze`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ snoozedUntil });

      expect(response.status).to.be(200);
      return response.body;
    }

    async function bulkAction(actions: Array<Record<string, unknown>>) {
      return supertestWithoutAuth
        .post(`${ACTION_POLICY_API_PATH}/_bulk`)
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
        { id: p1.id, action: 'snooze', snoozedUntil: futureDate },
        { id: p2.id, action: 'snooze', snoozedUntil: futureDate },
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
        { id: pSnooze.id, action: 'snooze', snoozedUntil: futureDate },
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

    it('should bulk delete policies', async () => {
      const p1 = await createPolicy('bulk-delete-1');
      const p2 = await createPolicy('bulk-delete-2');

      const response = await bulkAction([
        { id: p1.id, action: 'delete' },
        { id: p2.id, action: 'delete' },
      ]);

      expect(response.status).to.be(200);
      expect(response.body.processed).to.be(2);
      expect(response.body.total).to.be(2);
      expect(response.body.errors).to.have.length(0);

      const get1 = await supertestWithoutAuth
        .get(`${ACTION_POLICY_API_PATH}/${p1.id}`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader());
      const get2 = await supertestWithoutAuth
        .get(`${ACTION_POLICY_API_PATH}/${p2.id}`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader());

      expect(get1.status).to.be(404);
      expect(get2.status).to.be(404);
    });

    it('should handle mixed delete and update actions in a single request', async () => {
      const pEnable = await createPolicy('bulk-mixed-del-enable');
      const pDelete = await createPolicy('bulk-mixed-del-delete');
      await disablePolicy(pEnable.id);

      const response = await bulkAction([
        { id: pEnable.id, action: 'enable' },
        { id: pDelete.id, action: 'delete' },
      ]);

      expect(response.status).to.be(200);
      expect(response.body.processed).to.be(2);
      expect(response.body.total).to.be(2);
      expect(response.body.errors).to.have.length(0);

      const updatedEnable = await getPolicy(pEnable.id);
      expect(updatedEnable.enabled).to.be(true);

      const getDeleted = await supertestWithoutAuth
        .get(`${ACTION_POLICY_API_PATH}/${pDelete.id}`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader());
      expect(getDeleted.status).to.be(404);
    });

    it('should report errors for non-existent policies in bulk delete', async () => {
      const existing = await createPolicy('bulk-delete-partial');

      const response = await bulkAction([
        { id: existing.id, action: 'delete' },
        { id: 'non-existent-del-id', action: 'delete' },
      ]);

      expect(response.status).to.be(200);
      expect(response.body.processed).to.be(1);
      expect(response.body.total).to.be(2);
      expect(response.body.errors).to.have.length(1);
      expect(response.body.errors[0].id).to.be('non-existent-del-id');

      const getDeleted = await supertestWithoutAuth
        .get(`${ACTION_POLICY_API_PATH}/${existing.id}`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader());
      expect(getDeleted.status).to.be(404);
    });

    it('should bulk update API keys', async () => {
      const p1 = await createPolicy('bulk-update-key-1');
      const p2 = await createPolicy('bulk-update-key-2');

      const response = await bulkAction([
        { id: p1.id, action: 'update_api_key' },
        { id: p2.id, action: 'update_api_key' },
      ]);

      expect(response.status).to.be(200);
      expect(response.body.processed).to.be(2);
      expect(response.body.total).to.be(2);
      expect(response.body.errors).to.have.length(0);

      const updated1 = await getPolicy(p1.id);
      const updated2 = await getPolicy(p2.id);
      expect(updated1.name).to.be('bulk-update-key-1');
      expect(updated2.name).to.be('bulk-update-key-2');
      expect(updated1.auth).to.be.an('object');
      expect(updated2.auth).to.be.an('object');
    });

    it('should report errors for non-existent policies in bulk update API key', async () => {
      const existing = await createPolicy('bulk-update-key-partial');

      const response = await bulkAction([
        { id: existing.id, action: 'update_api_key' },
        { id: 'non-existent-key-id', action: 'update_api_key' },
      ]);

      expect(response.status).to.be(200);
      expect(response.body.processed).to.be(1);
      expect(response.body.total).to.be(2);
      expect(response.body.errors).to.have.length(1);
      expect(response.body.errors[0].id).to.be('non-existent-key-id');
    });

    it('should return 400 when bulk snooze has an invalid date', async () => {
      const p = await createPolicy('bulk-snooze-invalid');

      const response = await bulkAction([
        { id: p.id, action: 'snooze', snoozedUntil: 'not-a-date' },
      ]);

      expect(response.status).to.be(400);
    });

    it('should return 400 when actions array is empty', async () => {
      const response = await bulkAction([]);

      expect(response.status).to.be(400);
    });
  });
}
