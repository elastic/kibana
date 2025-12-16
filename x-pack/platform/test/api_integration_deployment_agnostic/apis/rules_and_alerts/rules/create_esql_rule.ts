/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { RoleCredentials } from '@kbn/ftr-common-functional-services';
import expect from 'expect';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import type { SupertestWithRoleScopeType } from '../../../services';
import { esqlRuleCreatorRole } from './roles';

export default function createEsqlRuleTests({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const supertest = getService('supertestWithoutAuth');
  const kibanaServer = getService('kibanaServer');
  const samlAuth = getService('samlAuth');
  let supertestWithAdminScope: SupertestWithRoleScopeType;
  let limitedStackRulesRole: RoleCredentials;

  describe('create_esql_rule', function () {
    this.tags('skipCloud');
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await samlAuth.setCustomRole(esqlRuleCreatorRole);
      limitedStackRulesRole = await samlAuth.createM2mApiKeyWithCustomRoleScope();
      supertestWithAdminScope = await roleScopedSupertest.getSupertestWithRoleScope('admin', {
        withInternalHeaders: true,
        withCustomHeaders: { 'kbn-xsrf': 'true' },
      });
    });

    beforeEach(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    after(async () => {
      await supertestWithAdminScope.destroy();
      await samlAuth.invalidateM2mApiKeyWithRoleScope(limitedStackRulesRole);
    });

    it('should handle create esql rule request appropriately', async () => {
      const { body: response } = await supertest
        .post(`/internal/rule/esql`)
        .set(limitedStackRulesRole.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .set('kbn-internal-origin', 'esqlRuleCreatorRole')
        .send({
          name: 'abc',
          tags: ['foo'],
          schedule: '5m',
          enabled: false,
          esql: 'FROM an_index | STATS count = COUNT(*) BY host.name',
          timeField: '@timestamp',
          lookbackWindow: '15m',
          group_key: ['host.name'],
        });

      expect(response).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          name: 'abc',
          tags: ['foo'],
          actions: [],
          enabled: false,
          rule_type_id: '.esql',
          running: false,
          consumer: 'alerts',
          params: {
            esqlQuery: {
              esql: 'FROM an_index | STATS count = COUNT(*) BY host.name',
            },
            timeWindowSize: 15,
            timeWindowUnit: 'm',
            timeField: '@timestamp',
            group_key: ['host.name'],
          },
          schedule: { interval: '5m' },
        })
      );
    });
  });
}
