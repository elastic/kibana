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

  async function createRule(roleAuthc: RoleCredentials) {
    return supertestWithoutAuth
      .post(RULE_API_PATH)
      .set(roleAuthc.apiKeyHeader)
      .set(samlAuth.getInternalRequestHeader())
      .send({
        kind: 'alert',
        metadata: { name: 'original-rule', owner: 'team-a', labels: ['prod'] },
        time_field: '@timestamp',
        schedule: { every: '5m', lookback: '10m' },
        evaluation: {
          query: { base: 'FROM logs-* | LIMIT 10', condition: 'status == "error"' },
        },
        grouping: { fields: ['host.name'] },
      });
  }

  describe('Update Rule API', function () {
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

    it('should update metadata and evaluation together', async () => {
      const createResponse = await createRule(roleAuthc);
      expect(createResponse.status).to.be(200);

      const ruleId = createResponse.body.id as string;

      const response = await supertestWithoutAuth
        .patch(`${RULE_API_PATH}/${ruleId}`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          metadata: { name: 'updated-rule', owner: 'team-b' },
          evaluation: { query: { base: 'FROM metrics-* | LIMIT 5' } },
        });

      expect(response.status).to.be(200);
      expect(response.body.id).to.be(ruleId);
      expect(response.body.kind).to.be('alert');
      expect(response.body.metadata.name).to.be('updated-rule');
      expect(response.body.metadata.owner).to.be('team-b');
      expect(response.body.evaluation.query.base).to.be('FROM metrics-* | LIMIT 5');
      // Original schedule should be preserved
      expect(response.body.schedule).to.eql({ every: '5m', lookback: '10m' });
      expect(response.body.updatedAt).to.be.a('string');
    });

    it('should update only metadata name', async () => {
      const createResponse = await createRule(roleAuthc);
      expect(createResponse.status).to.be(200);

      const ruleId = createResponse.body.id as string;

      const response = await supertestWithoutAuth
        .patch(`${RULE_API_PATH}/${ruleId}`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ metadata: { name: 'only-name-updated' } });

      expect(response.status).to.be(200);
      expect(response.body.metadata.name).to.be('only-name-updated');
      // Original fields should be preserved
      expect(response.body.schedule).to.eql({ every: '5m', lookback: '10m' });
      expect(response.body.evaluation).to.eql({
        query: { base: 'FROM logs-* | LIMIT 10', condition: 'status == "error"' },
      });
      expect(response.body.grouping).to.eql({ fields: ['host.name'] });
    });

    it('should update schedule lookback without changing interval', async () => {
      const createResponse = await createRule(roleAuthc);
      expect(createResponse.status).to.be(200);

      const ruleId = createResponse.body.id as string;

      const response = await supertestWithoutAuth
        .patch(`${RULE_API_PATH}/${ruleId}`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ schedule: { lookback: '15m' } });

      expect(response.status).to.be(200);
      expect(response.body.schedule.lookback).to.be('15m');
      // Original interval should be preserved
      expect(response.body.schedule.every).to.be('5m');
      // Original metadata should be preserved
      expect(response.body.metadata.name).to.be('original-rule');
      expect(response.body.metadata.owner).to.be('team-a');
    });

    it('should update only evaluation query', async () => {
      const createResponse = await createRule(roleAuthc);
      expect(createResponse.status).to.be(200);

      const ruleId = createResponse.body.id as string;

      const response = await supertestWithoutAuth
        .patch(`${RULE_API_PATH}/${ruleId}`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ evaluation: { query: { base: 'FROM new-index-* | LIMIT 100' } } });

      expect(response.status).to.be(200);
      expect(response.body.evaluation.query.base).to.be('FROM new-index-* | LIMIT 100');
      // Original metadata and schedule should be preserved
      expect(response.body.metadata.name).to.be('original-rule');
      expect(response.body.schedule).to.eql({ every: '5m', lookback: '10m' });
    });

    it('should clear optional fields when set to null', async () => {
      const createResponse = await createRule(roleAuthc);
      expect(createResponse.status).to.be(200);

      const ruleId = createResponse.body.id as string;

      // Verify grouping was set during creation
      expect(createResponse.body.grouping).to.eql({ fields: ['host.name'] });

      const response = await supertestWithoutAuth
        .patch(`${RULE_API_PATH}/${ruleId}`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ grouping: null });

      expect(response.status).to.be(200);
      expect(response.body.grouping).to.be(undefined);
    });

    it('should return 404 when updating a non-existent rule', async () => {
      const response = await supertestWithoutAuth
        .patch(`${RULE_API_PATH}/non-existent-rule-id`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ metadata: { name: 'does-not-exist' } });

      expect(response.status).to.be(404);
    });
  });
}
