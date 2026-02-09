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

  describe('Create Notification Policy API', function () {
    let roleAuthc: RoleCredentials;

    before(async () => {
      await kibanaServer.savedObjects.clean({ types: [NOTIFICATION_POLICY_SO_TYPE] });
      roleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('admin');
    });

    after(async () => {
      await kibanaServer.savedObjects.clean({ types: [NOTIFICATION_POLICY_SO_TYPE] });
      await samlAuth.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });

    it('should create a notification policy with auto-generated id', async () => {
      const response = await supertestWithoutAuth
        .post(NOTIFICATION_POLICY_API_PATH)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ name: 'my-policy', workflow_id: 'my-workflow-id' });

      expect(response.status).to.be(200);
      expect(response.body.id).to.be.a('string');
      expect(response.body.name).to.be('my-policy');
      expect(response.body.workflow_id).to.be('my-workflow-id');
      expect(response.body.createdAt).to.be.a('string');
      expect(response.body.updatedAt).to.be.a('string');
    });

    it('should create a notification policy with a custom id', async () => {
      const customId = 'custom-notification-policy-id';

      const response = await supertestWithoutAuth
        .post(`${NOTIFICATION_POLICY_API_PATH}/${customId}`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ name: 'another-policy', workflow_id: 'another-workflow-id' });

      expect(response.status).to.be(200);
      expect(response.body.id).to.be(customId);
      expect(response.body.name).to.be('another-policy');
      expect(response.body.workflow_id).to.be('another-workflow-id');
    });

    it('should return 409 when creating a notification policy with an existing id', async () => {
      const existingId = 'existing-policy-id';

      // Create the first policy
      const firstResponse = await supertestWithoutAuth
        .post(`${NOTIFICATION_POLICY_API_PATH}/${existingId}`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ name: 'policy-1', workflow_id: 'workflow-1' });

      expect(firstResponse.status).to.be(200);

      // Try to create another policy with the same id
      const secondResponse = await supertestWithoutAuth
        .post(`${NOTIFICATION_POLICY_API_PATH}/${existingId}`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ name: 'policy-2', workflow_id: 'workflow-2' });

      expect(secondResponse.status).to.be(409);
    });

    it('should return 400 when name is missing', async () => {
      const response = await supertestWithoutAuth
        .post(NOTIFICATION_POLICY_API_PATH)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ workflow_id: 'my-workflow-id' });

      expect(response.status).to.be(400);
    });

    it('should return 400 when workflow_id is missing', async () => {
      const response = await supertestWithoutAuth
        .post(NOTIFICATION_POLICY_API_PATH)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ name: 'my-policy' });

      expect(response.status).to.be(400);
    });
  });
}
