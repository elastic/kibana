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
          destinations: [{ type: 'workflow', id: 'original-workflow-id' }],
          matcher: "env == 'production' && region == 'us-east-1'",
          groupBy: ['service.name'],
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
          destinations: [{ type: 'workflow', id: 'updated-workflow-id' }],
          description: 'updated-policy-description',
          matcher: "env == 'production' && region == 'us-west-2'",
          groupBy: ['service.name', 'environment'],
          throttle: { interval: '5m' },
          version: currentVersion,
        });

      expect(response.status).to.be(200);
      expect(response.body.id).to.be(createdPolicyId);
      expect(response.body.version).to.be.a('string');
      expect(response.body.name).to.be('updated-policy');
      expect(response.body.destinations).to.eql([{ type: 'workflow', id: 'updated-workflow-id' }]);
      expect(response.body.description).to.be('updated-policy-description');
      expect(response.body.matcher).to.be("env == 'production' && region == 'us-west-2'");
      expect(response.body.groupBy).to.eql(['service.name', 'environment']);
      expect(response.body.throttle).to.eql({ interval: '5m' });
      expect(response.body.updatedAt).to.be.a('string');
      expect(response.body.auth).to.be.an('object');
      expect(response.body.auth.owner).to.be.a('string');
      expect(response.body.auth.createdByUser).to.be(true);
      expect(response.body.auth.apiKey).to.be(undefined);
    });

    it('should update only name', async () => {
      const createResponse = await supertestWithoutAuth
        .post(NOTIFICATION_POLICY_API_PATH)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          name: 'original-policy',
          description: 'original-policy-description',
          destinations: [{ type: 'workflow', id: 'original-workflow-id' }],
          matcher: "env == 'production' && region == 'us-east-1'",
          groupBy: ['service.name'],
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
      expect(response.body.destinations).to.eql([{ type: 'workflow', id: 'original-workflow-id' }]);
      expect(response.body.matcher).to.be("env == 'production' && region == 'us-east-1'");
      expect(response.body.groupBy).to.eql(['service.name']);
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
          destinations: [{ type: 'workflow', id: 'original-workflow-id' }],
          matcher: "env == 'production' && region == 'us-east-1'",
          groupBy: ['service.name'],
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
      expect(response.body.destinations).to.eql([{ type: 'workflow', id: 'original-workflow-id' }]);
      expect(response.body.matcher).to.be("env == 'production' && region == 'us-east-1'");
      expect(response.body.groupBy).to.eql(['service.name']);
      expect(response.body.throttle).to.eql({ interval: '1m' });
    });

    it('should update only matcher, groupBy, and throttle', async () => {
      const createResponse = await supertestWithoutAuth
        .post(NOTIFICATION_POLICY_API_PATH)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          name: 'original-policy',
          description: 'original-policy-description',
          destinations: [{ type: 'workflow', id: 'original-workflow-id' }],
          matcher: "env == 'production' && region == 'us-east-1'",
          groupBy: ['service.name'],
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
          groupBy: ['service.name', 'host.name'],
          throttle: { interval: '15m' },
          version: currentVersion,
        });

      expect(response.status).to.be(200);
      expect(response.body.version).to.be.a('string');
      expect(response.body.name).to.be('original-policy');
      expect(response.body.description).to.be('original-policy-description');
      expect(response.body.destinations).to.eql([{ type: 'workflow', id: 'original-workflow-id' }]);
      expect(response.body.matcher).to.be("env == 'staging' && region == 'eu-central-1'");
      expect(response.body.groupBy).to.eql(['service.name', 'host.name']);
      expect(response.body.throttle).to.eql({ interval: '15m' });
    });

    it('should return 409 when version is stale', async () => {
      const createResponse = await supertestWithoutAuth
        .post(NOTIFICATION_POLICY_API_PATH)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          name: 'conflict-policy',
          description: 'conflict-policy description',
          destinations: [{ type: 'workflow', id: 'conflict-workflow-id' }],
        });

      expect(createResponse.status).to.be(200);

      const createdPolicyId = createResponse.body.id as string;
      const staleVersion = createResponse.body.version as string;

      const firstUpdate = await supertestWithoutAuth
        .put(`${NOTIFICATION_POLICY_API_PATH}/${createdPolicyId}`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ name: 'first-update', version: staleVersion });

      expect(firstUpdate.status).to.be(200);

      const secondUpdate = await supertestWithoutAuth
        .put(`${NOTIFICATION_POLICY_API_PATH}/${createdPolicyId}`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ name: 'second-update', version: staleVersion });

      expect(secondUpdate.status).to.be(409);
    });

    it('should clear nullable fields when set to null', async () => {
      const createResponse = await supertestWithoutAuth
        .post(NOTIFICATION_POLICY_API_PATH)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          name: 'nullable-policy',
          description: 'nullable-policy description',
          destinations: [{ type: 'workflow', id: 'nullable-workflow-id' }],
          matcher: "env == 'production'",
          groupBy: ['service.name'],
          throttle: { interval: '5m' },
        });

      expect(createResponse.status).to.be(200);

      const createdPolicyId = createResponse.body.id as string;
      const currentVersion = createResponse.body.version as string;

      const response = await supertestWithoutAuth
        .put(`${NOTIFICATION_POLICY_API_PATH}/${createdPolicyId}`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          matcher: null,
          groupBy: null,
          throttle: null,
          version: currentVersion,
        });

      expect(response.status).to.be(200);
      expect(response.body.matcher).to.be(null);
      expect(response.body.groupBy).to.be(null);
      expect(response.body.throttle).to.be(null);
      expect(response.body.name).to.be('nullable-policy');
      expect(response.body.destinations).to.eql([{ type: 'workflow', id: 'nullable-workflow-id' }]);
    });

    it('should update only destinations while preserving other fields', async () => {
      const createResponse = await supertestWithoutAuth
        .post(NOTIFICATION_POLICY_API_PATH)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          name: 'dest-policy',
          description: 'dest-policy description',
          destinations: [{ type: 'workflow', id: 'original-dest-workflow' }],
          matcher: "env == 'staging'",
          groupBy: ['host.name'],
          throttle: { interval: '2m' },
        });

      expect(createResponse.status).to.be(200);

      const createdPolicyId = createResponse.body.id as string;
      const currentVersion = createResponse.body.version as string;

      const response = await supertestWithoutAuth
        .put(`${NOTIFICATION_POLICY_API_PATH}/${createdPolicyId}`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          destinations: [{ type: 'workflow', id: 'updated-dest-workflow' }],
          version: currentVersion,
        });

      expect(response.status).to.be(200);
      expect(response.body.destinations).to.eql([
        { type: 'workflow', id: 'updated-dest-workflow' },
      ]);
      expect(response.body.name).to.be('dest-policy');
      expect(response.body.description).to.be('dest-policy description');
      expect(response.body.matcher).to.be("env == 'staging'");
      expect(response.body.groupBy).to.eql(['host.name']);
      expect(response.body.throttle).to.eql({ interval: '2m' });
    });

    it('should return 400 when destinations is an empty array', async () => {
      const createResponse = await supertestWithoutAuth
        .post(NOTIFICATION_POLICY_API_PATH)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          name: 'empty-dest-policy',
          description: 'empty-dest-policy description',
          destinations: [{ type: 'workflow', id: 'some-workflow' }],
        });

      expect(createResponse.status).to.be(200);

      const createdPolicyId = createResponse.body.id as string;
      const currentVersion = createResponse.body.version as string;

      const response = await supertestWithoutAuth
        .put(`${NOTIFICATION_POLICY_API_PATH}/${createdPolicyId}`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ destinations: [], version: currentVersion });

      expect(response.status).to.be(400);
    });

    it('should return 404 when updating a non-existent notification policy', async () => {
      const response = await supertestWithoutAuth
        .put(`${NOTIFICATION_POLICY_API_PATH}/non-existent-id`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          name: 'some-name',
          description: 'some-description',
          destinations: [{ type: 'workflow', id: 'some-workflow-id' }],
          version: 'WzEsMV0=',
        });

      expect(response.status).to.be(404);
    });
  });
}
