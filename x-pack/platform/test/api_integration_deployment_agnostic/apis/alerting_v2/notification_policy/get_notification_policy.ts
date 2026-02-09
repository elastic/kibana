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

  describe('Get Notification Policy API', function () {
    let roleAuthc: RoleCredentials;
    let createdPolicyId: string;

    before(async () => {
      await kibanaServer.savedObjects.clean({ types: [NOTIFICATION_POLICY_SO_TYPE] });
      roleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('admin');

      // Create a notification policy to test get
      const createResponse = await supertestWithoutAuth
        .post(NOTIFICATION_POLICY_API_PATH)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ name: 'test-policy-for-get', workflow_id: 'test-workflow-for-get' });

      createdPolicyId = createResponse.body.id;
    });

    after(async () => {
      await kibanaServer.savedObjects.clean({ types: [NOTIFICATION_POLICY_SO_TYPE] });
      await samlAuth.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });

    it('should get a notification policy by id', async () => {
      const response = await supertestWithoutAuth
        .get(`${NOTIFICATION_POLICY_API_PATH}/${createdPolicyId}`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader());

      expect(response.status).to.be(200);
      expect(response.body.id).to.be(createdPolicyId);
      expect(response.body.name).to.be('test-policy-for-get');
      expect(response.body.workflow_id).to.be('test-workflow-for-get');
      expect(response.body.createdAt).to.be.a('string');
      expect(response.body.updatedAt).to.be.a('string');
    });

    it('should return 404 for non-existent notification policy', async () => {
      const response = await supertestWithoutAuth
        .get(`${NOTIFICATION_POLICY_API_PATH}/non-existent-id`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader());

      expect(response.status).to.be(404);
    });
  });
}
