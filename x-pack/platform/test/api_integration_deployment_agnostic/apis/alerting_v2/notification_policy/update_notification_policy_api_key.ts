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

  describe('Update Notification Policy API Key API', function () {
    let roleAuthc: RoleCredentials;

    before(async () => {
      await kibanaServer.savedObjects.clean({ types: [NOTIFICATION_POLICY_SO_TYPE] });
      roleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('admin');
    });

    after(async () => {
      await kibanaServer.savedObjects.clean({ types: [NOTIFICATION_POLICY_SO_TYPE] });
      await samlAuth.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });

    it('should update the API key and return 204', async () => {
      const createResponse = await supertestWithoutAuth
        .post(NOTIFICATION_POLICY_API_PATH)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          name: 'api-key-update-policy',
          description: 'api-key-update-policy description',
          destinations: [{ type: 'workflow', id: 'api-key-workflow-id' }],
        });

      expect(createResponse.status).to.be(200);

      const policyId = createResponse.body.id as string;
      const originalUpdatedAt = createResponse.body.updatedAt as string;

      const updateApiKeyResponse = await supertestWithoutAuth
        .post(`${NOTIFICATION_POLICY_API_PATH}/${policyId}/_update_api_key`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader());

      expect(updateApiKeyResponse.status).to.be(204);

      const getResponse = await supertestWithoutAuth
        .get(`${NOTIFICATION_POLICY_API_PATH}/${policyId}`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader());

      expect(getResponse.status).to.be(200);
      expect(getResponse.body.name).to.be('api-key-update-policy');
      expect(getResponse.body.description).to.be('api-key-update-policy description');
      expect(getResponse.body.destinations).to.eql([
        { type: 'workflow', id: 'api-key-workflow-id' },
      ]);
      expect(getResponse.body.enabled).to.be(true);
      expect(getResponse.body.auth).to.be.an('object');
      expect(getResponse.body.auth.owner).to.be.a('string');
      expect(getResponse.body.auth.apiKey).to.be(undefined);
      expect(getResponse.body.updatedAt).to.not.be(originalUpdatedAt);
    });

    it('should preserve all policy attributes when updating the API key', async () => {
      const createResponse = await supertestWithoutAuth
        .post(NOTIFICATION_POLICY_API_PATH)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          name: 'preserve-attrs-policy',
          description: 'preserve-attrs-policy description',
          destinations: [{ type: 'workflow', id: 'preserve-workflow-id' }],
          matcher: "env == 'production' && region == 'us-east-1'",
          groupBy: ['service.name'],
          throttle: { interval: '5m' },
        });

      expect(createResponse.status).to.be(200);

      const policyId = createResponse.body.id as string;

      const updateApiKeyResponse = await supertestWithoutAuth
        .post(`${NOTIFICATION_POLICY_API_PATH}/${policyId}/_update_api_key`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader());

      expect(updateApiKeyResponse.status).to.be(204);

      const getResponse = await supertestWithoutAuth
        .get(`${NOTIFICATION_POLICY_API_PATH}/${policyId}`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader());

      expect(getResponse.status).to.be(200);
      expect(getResponse.body.name).to.be('preserve-attrs-policy');
      expect(getResponse.body.description).to.be('preserve-attrs-policy description');
      expect(getResponse.body.destinations).to.eql([
        { type: 'workflow', id: 'preserve-workflow-id' },
      ]);
      expect(getResponse.body.matcher).to.be("env == 'production' && region == 'us-east-1'");
      expect(getResponse.body.groupBy).to.eql(['service.name']);
      expect(getResponse.body.throttle).to.eql({ interval: '5m' });
      expect(getResponse.body.enabled).to.be(true);
    });

    it('should return 404 when updating API key for a non-existent policy', async () => {
      const response = await supertestWithoutAuth
        .post(`${NOTIFICATION_POLICY_API_PATH}/non-existent-id/_update_api_key`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader());

      expect(response.status).to.be(404);
    });
  });
}
