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

  describe('Delete Notification Policy API', function () {
    let roleAuthc: RoleCredentials;

    before(async () => {
      await kibanaServer.savedObjects.clean({ types: [NOTIFICATION_POLICY_SO_TYPE] });
      roleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('admin');
    });

    after(async () => {
      await kibanaServer.savedObjects.clean({ types: [NOTIFICATION_POLICY_SO_TYPE] });
      await samlAuth.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });

    it('should delete a notification policy', async () => {
      // Create a notification policy to delete
      const createResponse = await supertestWithoutAuth
        .post(NOTIFICATION_POLICY_API_PATH)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ name: 'policy-to-delete', workflow_id: 'workflow-to-delete' });

      const policyId = createResponse.body.id;

      // Delete the notification policy
      const deleteResponse = await supertestWithoutAuth
        .delete(`${NOTIFICATION_POLICY_API_PATH}/${policyId}`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader());

      expect(deleteResponse.status).to.be(204);

      // Verify it's deleted by trying to get it
      const getResponse = await supertestWithoutAuth
        .get(`${NOTIFICATION_POLICY_API_PATH}/${policyId}`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader());

      expect(getResponse.status).to.be(404);
    });

    it('should return 404 when deleting a non-existent notification policy', async () => {
      const response = await supertestWithoutAuth
        .delete(`${NOTIFICATION_POLICY_API_PATH}/non-existent-id`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader());

      expect(response.status).to.be(404);
    });
  });
}
