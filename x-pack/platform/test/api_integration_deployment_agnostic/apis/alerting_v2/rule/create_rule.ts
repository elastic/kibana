/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import type { RoleCredentials } from '../../../services';

const RULE_API_PATH = '/api/alerting/v2/rules';
const RULE_SO_TYPE = 'alerting_rule';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const samlAuth = getService('samlAuth');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const kibanaServer = getService('kibanaServer');

  describe('Create Rule API', function () {
    // alerting_v2 plugin is behind a feature flag not available on Cloud/MKI
    this.tags(['skipCloud']);
    let roleAuthc: RoleCredentials;

    before(async () => {
      await kibanaServer.savedObjects.clean({ types: [RULE_SO_TYPE] });
      roleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('admin');
    });

    after(async () => {
      await kibanaServer.savedObjects.clean({ types: [RULE_SO_TYPE] });
      await samlAuth.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });

    it('should create an alert rule with auto-generated id', async () => {
      const response = await supertestWithoutAuth
        .post(RULE_API_PATH)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          kind: 'alert',
          metadata: { name: 'test-alert-rule' },
          time_field: '@timestamp',
          schedule: { every: '5m' },
          evaluation: { query: { base: 'FROM logs-* | LIMIT 10' } },
        });

      expect(response.status).to.be(201);
      expect(response.body.id).to.be.a('string');
      expect(response.body.kind).to.be('alert');
      expect(response.body.metadata.name).to.be('test-alert-rule');
      expect(response.body.time_field).to.be('@timestamp');
      expect(response.body.schedule).to.eql({ every: '5m' });
      expect(response.body.evaluation).to.eql({ query: { base: 'FROM logs-* | LIMIT 10' } });
      expect(response.body.enabled).to.be(true);
      expect(response.body.createdBy).to.be.a('string');
      expect(response.body.createdAt).to.be.a('string');
      expect(response.body.updatedBy).to.be.a('string');
      expect(response.body.updatedAt).to.be.a('string');
    });

    it('should create a signal rule', async () => {
      const response = await supertestWithoutAuth
        .post(RULE_API_PATH)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          kind: 'signal',
          metadata: { name: 'test-signal-rule' },
          time_field: '@timestamp',
          schedule: { every: '10m' },
          evaluation: { query: { base: 'FROM logs-* | LIMIT 1' } },
        });

      expect(response.status).to.be(201);
      expect(response.body.kind).to.be('signal');
      expect(response.body.metadata.name).to.be('test-signal-rule');
    });

    it('should create an alert rule with all optional fields', async () => {
      const response = await supertestWithoutAuth
        .post(RULE_API_PATH)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          kind: 'alert',
          metadata: { name: 'full-rule', owner: 'team-a', tags: ['critical', 'prod'] },
          time_field: '@timestamp',
          schedule: { every: '5m', lookback: '10m' },
          evaluation: {
            query: { base: 'FROM logs-* | LIMIT 10 | WHERE status == "error"' },
          },
          recovery_policy: { type: 'no_breach' },
          state_transition: { pending_count: 3 },
          grouping: { fields: ['host.name'] },
          no_data: { behavior: 'recover', timeframe: '15m' },
        });

      expect(response.status).to.be(201);
      expect(response.body.metadata).to.eql({
        name: 'full-rule',
        owner: 'team-a',
        tags: ['critical', 'prod'],
      });
      expect(response.body.schedule).to.eql({ every: '5m', lookback: '10m' });
      expect(response.body.evaluation).to.eql({
        query: { base: 'FROM logs-* | LIMIT 10 | WHERE status == "error"' },
      });
      expect(response.body.recovery_policy).to.eql({ type: 'no_breach' });
      expect(response.body.state_transition).to.eql({ pending_count: 3 });
      expect(response.body.grouping).to.eql({ fields: ['host.name'] });
      expect(response.body.no_data).to.eql({ behavior: 'recover', timeframe: '15m' });
    });

    it('should return 400 when kind is missing', async () => {
      const response = await supertestWithoutAuth
        .post(RULE_API_PATH)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          metadata: { name: 'no-kind-rule' },
          time_field: '@timestamp',
          schedule: { every: '5m' },
          evaluation: { query: { base: 'FROM logs-* | LIMIT 10' } },
        });

      expect(response.status).to.be(400);
    });

    it('should return 400 when metadata is missing', async () => {
      const response = await supertestWithoutAuth
        .post(RULE_API_PATH)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          kind: 'alert',
          time_field: '@timestamp',
          schedule: { every: '5m' },
          evaluation: { query: { base: 'FROM logs-* | LIMIT 10' } },
        });

      expect(response.status).to.be(400);
    });

    it('should return 400 when schedule is missing', async () => {
      const response = await supertestWithoutAuth
        .post(RULE_API_PATH)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          kind: 'alert',
          metadata: { name: 'no-schedule-rule' },
          time_field: '@timestamp',
          evaluation: { query: { base: 'FROM logs-* | LIMIT 10' } },
        });

      expect(response.status).to.be(400);
    });

    it('should return 400 when evaluation is missing', async () => {
      const response = await supertestWithoutAuth
        .post(RULE_API_PATH)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          kind: 'alert',
          metadata: { name: 'no-eval-rule' },
          time_field: '@timestamp',
          schedule: { every: '5m' },
        });

      expect(response.status).to.be(400);
    });

    it('should return 400 when state_transition is provided for signal kind', async () => {
      const response = await supertestWithoutAuth
        .post(RULE_API_PATH)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          kind: 'signal',
          metadata: { name: 'signal-with-transition' },
          time_field: '@timestamp',
          schedule: { every: '5m' },
          evaluation: { query: { base: 'FROM logs-* | LIMIT 10' } },
          state_transition: { pending_count: 3 },
        });

      expect(response.status).to.be(400);
    });
  });
}
