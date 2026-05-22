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

  describe('Upsert Action Policy API', function () {
    let roleAuthc: RoleCredentials;

    before(async () => {
      await kibanaServer.savedObjects.clean({ types: [ACTION_POLICY_SO_TYPE] });
      roleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('admin');
    });

    after(async () => {
      await kibanaServer.savedObjects.clean({ types: [ACTION_POLICY_SO_TYPE] });
      await samlAuth.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });

    it('should return 201 and create the action policy when the id does not exist', async () => {
      const policyId = 'upsert-create-policy';

      const response = await supertestWithoutAuth
        .put(`${ACTION_POLICY_API_PATH}/${policyId}`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          name: 'created-via-put',
          description: 'first version',
          destinations: [{ type: 'workflow', id: 'wf-1' }],
        });

      expect(response.status).to.be(201);
      expect(response.body.id).to.be(policyId);
      expect(response.body.version).to.be.a('string');
      expect(response.body.name).to.be('created-via-put');
      expect(response.body.description).to.be('first version');
      expect(response.body.destinations).to.eql([{ type: 'workflow', id: 'wf-1' }]);
      expect(response.body.enabled).to.be(true);
      expect(response.body.snoozedUntil).to.be(null);
      expect(response.body.createdAt).to.be.a('string');
      expect(response.body.updatedAt).to.be(response.body.createdAt);
      expect(response.body.auth).to.be.an('object');
      expect(response.body.auth.owner).to.be.a('string');
    });

    it('should return 200 and replace the action policy when the id already exists', async () => {
      const policyId = 'upsert-replace-policy';

      const createResponse = await supertestWithoutAuth
        .put(`${ACTION_POLICY_API_PATH}/${policyId}`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          name: 'first-version',
          description: 'before replace',
          destinations: [{ type: 'workflow', id: 'wf-1' }],
          matcher: 'env == "production"',
          groupBy: ['service.name'],
          throttle: { interval: '5m' },
        });

      expect(createResponse.status).to.be(201);
      const originalCreatedAt = createResponse.body.createdAt as string;
      const originalCreatedBy = createResponse.body.createdBy as string;
      const originalVersion = createResponse.body.version as string;

      const replaceResponse = await supertestWithoutAuth
        .put(`${ACTION_POLICY_API_PATH}/${policyId}`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          name: 'second-version',
          description: 'after replace',
          destinations: [{ type: 'workflow', id: 'wf-2' }],
        });

      expect(replaceResponse.status).to.be(200);
      expect(replaceResponse.body.id).to.be(policyId);

      // Replaced fields take the new values.
      expect(replaceResponse.body.name).to.be('second-version');
      expect(replaceResponse.body.description).to.be('after replace');
      expect(replaceResponse.body.destinations).to.eql([{ type: 'workflow', id: 'wf-2' }]);

      // Fields not in the new body are dropped (PUT replaces the whole resource).
      expect(replaceResponse.body.matcher).to.be(null);
      expect(replaceResponse.body.groupBy).to.be(null);
      expect(replaceResponse.body.throttle).to.be(null);

      // Audit metadata and operational state are preserved.
      expect(replaceResponse.body.createdBy).to.be(originalCreatedBy);
      expect(replaceResponse.body.createdAt).to.be(originalCreatedAt);
      expect(replaceResponse.body.enabled).to.be(true);
      expect(replaceResponse.body.snoozedUntil).to.be(null);

      // updatedAt advances and version changes; together these prove the SO was
      // rewritten and the API key was rotated. The actual key string is never
      // returned over the wire — see action_policy_client unit tests for direct
      // verification of apiKeyService.create / markApiKeysForInvalidation calls.
      expect(replaceResponse.body.updatedAt).not.to.be(originalCreatedAt);
      expect(replaceResponse.body.version).not.to.be(originalVersion);
    });

    it('should preserve enabled=false on replace', async () => {
      const policyId = 'upsert-preserve-disabled-policy';

      const createResponse = await supertestWithoutAuth
        .put(`${ACTION_POLICY_API_PATH}/${policyId}`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          name: 'to-be-disabled',
          description: 'first',
          destinations: [{ type: 'workflow', id: 'wf-1' }],
        });
      expect(createResponse.status).to.be(201);

      await supertestWithoutAuth
        .post(`${ACTION_POLICY_API_PATH}/${policyId}/_disable`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({})
        .expect(200);

      const replaceResponse = await supertestWithoutAuth
        .put(`${ACTION_POLICY_API_PATH}/${policyId}`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          name: 'replaced-while-disabled',
          description: 'second',
          destinations: [{ type: 'workflow', id: 'wf-1' }],
        });

      expect(replaceResponse.status).to.be(200);
      expect(replaceResponse.body.enabled).to.be(false);
    });

    it('should preserve snoozedUntil on replace', async () => {
      const policyId = 'upsert-preserve-snooze-policy';

      const createResponse = await supertestWithoutAuth
        .put(`${ACTION_POLICY_API_PATH}/${policyId}`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          name: 'to-be-snoozed',
          description: 'first',
          destinations: [{ type: 'workflow', id: 'wf-1' }],
        });
      expect(createResponse.status).to.be(201);

      const snoozedUntil = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const snoozeResponse = await supertestWithoutAuth
        .post(`${ACTION_POLICY_API_PATH}/${policyId}/_snooze`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ snoozedUntil });
      expect(snoozeResponse.status).to.be(200);

      const replaceResponse = await supertestWithoutAuth
        .put(`${ACTION_POLICY_API_PATH}/${policyId}`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          name: 'replaced-while-snoozed',
          description: 'second',
          destinations: [{ type: 'workflow', id: 'wf-1' }],
        });

      expect(replaceResponse.status).to.be(200);
      expect(replaceResponse.body.snoozedUntil).to.be(snoozedUntil);
    });

    it('should return 400 when the body is missing required fields', async () => {
      const response = await supertestWithoutAuth
        .put(`${ACTION_POLICY_API_PATH}/upsert-bad-body-policy`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ name: 'incomplete' });

      expect(response.status).to.be(400);
    });

    it('should return 400 when destinations is an empty array', async () => {
      const response = await supertestWithoutAuth
        .put(`${ACTION_POLICY_API_PATH}/upsert-empty-dest-policy`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          name: 'empty-destinations',
          description: 'should fail',
          destinations: [],
        });

      expect(response.status).to.be(400);
    });
  });
}
