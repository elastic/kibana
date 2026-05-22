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
const RULE_API_PATH = '/api/alerting/v2/rules';
const ACTION_POLICY_SO_TYPE = 'alerting_action_policy';
const RULE_SO_TYPE = 'alerting_rule';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const samlAuth = getService('samlAuth');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const kibanaServer = getService('kibanaServer');
  const spacesService = getService('spaces');

  describe('Create Action Policy API', function () {
    let roleAuthc: RoleCredentials;

    before(async () => {
      await kibanaServer.savedObjects.clean({ types: [ACTION_POLICY_SO_TYPE] });
      roleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('admin');
    });

    after(async () => {
      await kibanaServer.savedObjects.clean({ types: [ACTION_POLICY_SO_TYPE] });
      await samlAuth.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });

    it('should create a action policy with auto-generated id', async () => {
      const response = await supertestWithoutAuth
        .post(ACTION_POLICY_API_PATH)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          name: 'my-policy',
          description: 'my-policy description',
          destinations: [{ type: 'workflow', id: 'my-workflow-id' }],
          matcher: "env == 'production' && region == 'us-east-1'",
          groupBy: ['service.name', 'environment'],
          throttle: { interval: '1m' },
        });

      expect(response.status).to.be(201);
      expect(response.body.id).to.be.a('string');
      expect(response.body.version).to.be.a('string');
      expect(response.body.name).to.be('my-policy');
      expect(response.body.description).to.be('my-policy description');
      expect(response.body.destinations).to.eql([{ type: 'workflow', id: 'my-workflow-id' }]);
      expect(response.body.matcher).to.be("env == 'production' && region == 'us-east-1'");
      expect(response.body.groupBy).to.eql(['service.name', 'environment']);
      expect(response.body.groupingMode).to.be(null);
      expect(response.body.throttle).to.eql({ interval: '1m' });
      expect(response.body.createdAt).to.be.a('string');
      expect(response.body.updatedAt).to.be.a('string');
      expect(response.body.auth).to.be.an('object');
      expect(response.body.auth.owner).to.be.a('string');
      expect(response.body.auth.createdByUser).to.be(true);
      expect(response.body.auth.apiKey).to.be(undefined);
    });

    it('should return 400 when name is missing', async () => {
      const response = await supertestWithoutAuth
        .post(ACTION_POLICY_API_PATH)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          description: 'my-policy description',
          destinations: [{ type: 'workflow', id: 'my-workflow-id' }],
        });

      expect(response.status).to.be(400);
    });

    it('should return 400 when description is missing', async () => {
      const response = await supertestWithoutAuth
        .post(ACTION_POLICY_API_PATH)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          name: 'my-policy',
          destinations: [{ type: 'workflow', id: 'my-workflow-id' }],
        });

      expect(response.status).to.be(400);
    });

    it('should return 400 when destinations are missing', async () => {
      const response = await supertestWithoutAuth
        .post(ACTION_POLICY_API_PATH)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ name: 'my-policy', description: 'my-policy description' });

      expect(response.status).to.be(400);
    });

    it('should return 400 when throttle interval is invalid', async () => {
      const response = await supertestWithoutAuth
        .post(ACTION_POLICY_API_PATH)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          name: 'my-policy',
          description: 'my-policy description',
          destinations: [{ type: 'workflow', id: 'my-workflow-id' }],
          throttle: { interval: 'invalid-interval' },
        });

      expect(response.status).to.be(400);
    });

    it('should create with only required fields and return defaults', async () => {
      const response = await supertestWithoutAuth
        .post(ACTION_POLICY_API_PATH)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          name: 'minimal-policy',
          description: 'minimal-policy description',
          destinations: [{ type: 'workflow', id: 'minimal-workflow-id' }],
        });

      expect(response.status).to.be(201);
      expect(response.body.name).to.be('minimal-policy');
      expect(response.body.description).to.be('minimal-policy description');
      expect(response.body.destinations).to.eql([{ type: 'workflow', id: 'minimal-workflow-id' }]);
      expect(response.body.enabled).to.be(true);
      expect(response.body.snoozedUntil).to.be(null);
      expect(response.body.matcher).to.be(null);
      expect(response.body.groupBy).to.be(null);
      expect(response.body.groupingMode).to.be(null);
      expect(response.body.throttle).to.be(null);
    });

    it('should create a policy with groupingMode and throttle strategy', async () => {
      const response = await supertestWithoutAuth
        .post(ACTION_POLICY_API_PATH)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          name: 'per-field-policy',
          description: 'Groups by host with time interval',
          destinations: [{ type: 'workflow', id: 'wf-1' }],
          groupBy: ['host.name'],
          groupingMode: 'per_field',
          throttle: { strategy: 'time_interval', interval: '5m' },
        });

      expect(response.status).to.be(201);
      expect(response.body.groupingMode).to.be('per_field');
      expect(response.body.groupBy).to.eql(['host.name']);
      expect(response.body.throttle).to.eql({ strategy: 'time_interval', interval: '5m' });
    });

    it('should create a policy with per_episode grouping and on_status_change strategy', async () => {
      const response = await supertestWithoutAuth
        .post(ACTION_POLICY_API_PATH)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          name: 'per-episode-policy',
          description: 'Notifies on status change',
          destinations: [{ type: 'workflow', id: 'wf-1' }],
          groupingMode: 'per_episode',
          throttle: { strategy: 'on_status_change' },
        });

      expect(response.status).to.be(201);
      expect(response.body.groupingMode).to.be('per_episode');
      expect(response.body.throttle).to.eql({ strategy: 'on_status_change', interval: null });
    });

    it('should create a policy with all grouping mode and every_time strategy', async () => {
      const response = await supertestWithoutAuth
        .post(ACTION_POLICY_API_PATH)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          name: 'all-mode-policy',
          description: 'Digest of all episodes every time',
          destinations: [{ type: 'workflow', id: 'wf-1' }],
          groupingMode: 'all',
          throttle: { strategy: 'every_time' },
        });

      expect(response.status).to.be(201);
      expect(response.body.groupingMode).to.be('all');
      expect(response.body.throttle).to.eql({ strategy: 'every_time', interval: null });
    });

    it('should return 400 for invalid groupingMode/strategy combination', async () => {
      const response = await supertestWithoutAuth
        .post(ACTION_POLICY_API_PATH)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          name: 'invalid-combo',
          description: 'on_status_change is not valid for all mode',
          destinations: [{ type: 'workflow', id: 'wf-1' }],
          groupingMode: 'all',
          throttle: { strategy: 'on_status_change' },
        });

      expect(response.status).to.be(400);
    });

    it('should return 400 when time_interval strategy is missing interval', async () => {
      const response = await supertestWithoutAuth
        .post(ACTION_POLICY_API_PATH)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          name: 'missing-interval',
          description: 'time_interval requires interval',
          destinations: [{ type: 'workflow', id: 'wf-1' }],
          groupingMode: 'all',
          throttle: { strategy: 'time_interval' },
        });

      expect(response.status).to.be(400);
    });

    it('should return 400 when destinations is an empty array', async () => {
      const response = await supertestWithoutAuth
        .post(ACTION_POLICY_API_PATH)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          name: 'empty-dest-policy',
          description: 'empty-dest-policy description',
          destinations: [],
        });

      expect(response.status).to.be(400);
    });

    describe('single_rule type in a non-default space', () => {
      const customSpaceId = 'create-action-policy-custom-space';
      let createdRuleId: string;

      before(async () => {
        await spacesService.create({ id: customSpaceId, name: 'Create Action Policy Space' });

        const ruleResponse = await supertestWithoutAuth
          .post(`/s/${customSpaceId}${RULE_API_PATH}`)
          .set(roleAuthc.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({
            kind: 'alert',
            metadata: { name: 'rule-in-custom-space' },
            time_field: '@timestamp',
            schedule: { every: '5m' },
            evaluation: { query: { base: 'FROM logs-* | LIMIT 10' } },
          });

        expect(ruleResponse.status).to.be(201);
        createdRuleId = ruleResponse.body.id;
      });

      after(async () => {
        await spacesService.delete(customSpaceId);
        await kibanaServer.savedObjects.clean({
          types: [RULE_SO_TYPE, ACTION_POLICY_SO_TYPE],
        });
      });

      it('should create a single_rule action policy when the rule exists in the same non-default space', async () => {
        const response = await supertestWithoutAuth
          .post(`/s/${customSpaceId}${ACTION_POLICY_API_PATH}`)
          .set(roleAuthc.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({
            name: 'single-rule-policy-in-custom-space',
            description: 'linked to a rule that exists in the same custom space',
            type: 'single_rule',
            ruleId: createdRuleId,
            destinations: [{ type: 'workflow', id: 'wf-1' }],
          });

        expect(response.status).to.be(201);
        expect(response.body.type).to.be('single_rule');
        expect(response.body.ruleId).to.be(createdRuleId);
      });
    });
  });
}
