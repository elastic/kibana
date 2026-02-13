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

  describe('Update Notification Policy API', function () {
    let roleAuthc: RoleCredentials;

    before(async () => {
      await kibanaServer.savedObjects.clean({ types: [NOTIFICATION_POLICY_SO_TYPE] });
      roleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('admin');
    });

    after(async () => {
      await kibanaServer.savedObjects.clean({ types: [NOTIFICATION_POLICY_SO_TYPE] });
      await samlAuth.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });

    it('should update a notification policy', async () => {
      const createResponse = await supertestWithoutAuth
        .post(NOTIFICATION_POLICY_API_PATH)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          name: 'original-policy',
          description: 'original-policy-description',
          workflow_id: 'original-workflow-id',
          matcher: "env == 'production' && region == 'us-east-1'",
          group_by: ['service.name'],
          throttle: { interval: '1m' },
        });

      expect(createResponse.status).to.be(200);

      const createdPolicyId = createResponse.body.id as string;
      const currentVersion = createResponse.body.version as string;

      const response = await supertestWithoutAuth
        .put(`${NOTIFICATION_POLICY_API_PATH}/${createdPolicyId}`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          name: 'updated-policy',
          workflow_id: 'updated-workflow-id',
          description: 'updated-policy-description',
          matcher: "env == 'production' && region == 'us-west-2'",
          group_by: ['service.name', 'environment'],
          throttle: { interval: '5m' },
          version: currentVersion,
        });

      expect(response.status).to.be(200);
      expect(response.body.id).to.be(createdPolicyId);
      expect(response.body.version).to.be.a('string');
      expect(response.body.name).to.be('updated-policy');
      expect(response.body.workflow_id).to.be('updated-workflow-id');
      expect(response.body.description).to.be('updated-policy-description');
      expect(response.body.matcher).to.be("env == 'production' && region == 'us-west-2'");
      expect(response.body.group_by).to.eql(['service.name', 'environment']);
      expect(response.body.throttle).to.eql({ interval: '5m' });
      expect(response.body.updatedAt).to.be.a('string');
    });

    it('should update only name', async () => {
      const createResponse = await supertestWithoutAuth
        .post(NOTIFICATION_POLICY_API_PATH)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          name: 'original-policy',
          description: 'original-policy-description',
          workflow_id: 'original-workflow-id',
          matcher: "env == 'production' && region == 'us-east-1'",
          group_by: ['service.name'],
          throttle: { interval: '1m' },
        });

      expect(createResponse.status).to.be(200);

      const createdPolicyId = createResponse.body.id as string;
      const currentVersion = createResponse.body.version as string;

      const response = await supertestWithoutAuth
        .put(`${NOTIFICATION_POLICY_API_PATH}/${createdPolicyId}`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ name: 'only-name-updated', version: currentVersion });

      expect(response.status).to.be(200);
      expect(response.body.version).to.be.a('string');
      expect(response.body.name).to.be('only-name-updated');
      expect(response.body.description).to.be('original-policy-description');
      expect(response.body.workflow_id).to.be('original-workflow-id');
      expect(response.body.matcher).to.be("env == 'production' && region == 'us-east-1'");
      expect(response.body.group_by).to.eql(['service.name']);
      expect(response.body.throttle).to.eql({ interval: '1m' });
    });

    it('should update only description', async () => {
      const createResponse = await supertestWithoutAuth
        .post(NOTIFICATION_POLICY_API_PATH)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          name: 'original-policy',
          description: 'original-policy-description',
          workflow_id: 'original-workflow-id',
          matcher: "env == 'production' && region == 'us-east-1'",
          group_by: ['service.name'],
          throttle: { interval: '1m' },
        });

      expect(createResponse.status).to.be(200);

      const createdPolicyId = createResponse.body.id as string;
      const currentVersion = createResponse.body.version as string;

      const response = await supertestWithoutAuth
        .put(`${NOTIFICATION_POLICY_API_PATH}/${createdPolicyId}`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ description: 'only-description-updated', version: currentVersion });

      expect(response.status).to.be(200);
      expect(response.body.version).to.be.a('string');
      expect(response.body.name).to.be('original-policy');
      expect(response.body.description).to.be('only-description-updated');
      expect(response.body.workflow_id).to.be('original-workflow-id');
      expect(response.body.matcher).to.be("env == 'production' && region == 'us-east-1'");
      expect(response.body.group_by).to.eql(['service.name']);
      expect(response.body.throttle).to.eql({ interval: '1m' });
    });

    it('should update only matcher, group_by, and throttle', async () => {
      const createResponse = await supertestWithoutAuth
        .post(NOTIFICATION_POLICY_API_PATH)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          name: 'original-policy',
          description: 'original-policy-description',
          workflow_id: 'original-workflow-id',
          matcher: "env == 'production' && region == 'us-east-1'",
          group_by: ['service.name'],
          throttle: { interval: '1m' },
        });

      expect(createResponse.status).to.be(200);

      const createdPolicyId = createResponse.body.id as string;
      const currentVersion = createResponse.body.version as string;

      const response = await supertestWithoutAuth
        .put(`${NOTIFICATION_POLICY_API_PATH}/${createdPolicyId}`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          matcher: "env == 'staging' && region == 'eu-central-1'",
          group_by: ['service.name', 'host.name'],
          throttle: { interval: '15m' },
          version: currentVersion,
        });

      expect(response.status).to.be(200);
      expect(response.body.version).to.be.a('string');
      expect(response.body.name).to.be('original-policy');
      expect(response.body.description).to.be('original-policy-description');
      expect(response.body.workflow_id).to.be('original-workflow-id');
      expect(response.body.matcher).to.be("env == 'staging' && region == 'eu-central-1'");
      expect(response.body.group_by).to.eql(['service.name', 'host.name']);
      expect(response.body.throttle).to.eql({ interval: '15m' });
    });

    it('should return 404 when updating a non-existent notification policy', async () => {
      const response = await supertestWithoutAuth
        .put(`${NOTIFICATION_POLICY_API_PATH}/non-existent-id`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          name: 'some-name',
          description: 'some-description',
          workflow_id: 'some-workflow-id',
          version: 'WzEsMV0=',
        });

      expect(response.status).to.be(404);
    });
  });
}
