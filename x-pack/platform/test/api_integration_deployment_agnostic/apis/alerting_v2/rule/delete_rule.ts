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

  describe('Delete Rule API', function () {
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

    it('should delete a rule by id', async () => {
      const createResponse = await supertestWithoutAuth
        .post(RULE_API_PATH)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({
          kind: 'alert',
          metadata: { name: 'rule-to-delete' },
          time_field: '@timestamp',
          schedule: { every: '5m' },
          evaluation: { query: { base: 'FROM logs-* | LIMIT 10' } },
        });

      expect(createResponse.status).to.be(200);
      const createdRuleId = createResponse.body.id;

      const deleteResponse = await supertestWithoutAuth
        .delete(`${RULE_API_PATH}/${createdRuleId}`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader());

      expect(deleteResponse.status).to.be(204);

      // Verify the rule no longer exists
      const getResponse = await supertestWithoutAuth
        .get(`${RULE_API_PATH}/${createdRuleId}`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader());

      expect(getResponse.status).to.be(404);
    });

    it('should return 404 when deleting a non-existent rule', async () => {
      const response = await supertestWithoutAuth
        .delete(`${RULE_API_PATH}/non-existent-rule-id`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader());

      expect(response.status).to.be(404);
    });
  });
}
