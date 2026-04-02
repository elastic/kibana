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

  describe('Get Rule API', function () {
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

    it('should get a rule by id', async () => {
      const createResponse = await supertestWithoutAuth
        .post(RULE_API_PATH)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          kind: 'alert',
          metadata: { name: 'get-test-rule', owner: 'team-a', labels: ['test'] },
          time_field: '@timestamp',
          schedule: { every: '5m', lookback: '10m' },
          evaluation: {
            query: { base: 'FROM logs-* | LIMIT 10', condition: 'status == "error"' },
          },
          grouping: { fields: ['host.name'] },
        });

      expect(createResponse.status).to.be(200);
      const createdRuleId = createResponse.body.id;

      const response = await supertestWithoutAuth
        .get(`${RULE_API_PATH}/${createdRuleId}`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader());

      expect(response.status).to.be(200);
      expect(response.body.id).to.be(createdRuleId);
      expect(response.body.kind).to.be('alert');
      expect(response.body.metadata).to.eql({
        name: 'get-test-rule',
        owner: 'team-a',
        labels: ['test'],
      });
      expect(response.body.time_field).to.be('@timestamp');
      expect(response.body.schedule).to.eql({ every: '5m', lookback: '10m' });
      expect(response.body.evaluation).to.eql({
        query: { base: 'FROM logs-* | LIMIT 10', condition: 'status == "error"' },
      });
      expect(response.body.grouping).to.eql({ fields: ['host.name'] });
      expect(response.body.enabled).to.be(true);
      expect(response.body.createdBy).to.be.a('string');
      expect(response.body.createdAt).to.be.a('string');
      expect(response.body.updatedBy).to.be.a('string');
      expect(response.body.updatedAt).to.be.a('string');
    });

    it('should return 404 for non-existent rule', async () => {
      const response = await supertestWithoutAuth
        .get(`${RULE_API_PATH}/non-existent-rule-id`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader());

      expect(response.status).to.be(404);
    });
  });
}
