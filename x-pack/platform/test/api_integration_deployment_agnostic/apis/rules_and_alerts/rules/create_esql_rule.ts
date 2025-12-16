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
      await kibanaServer.savedObjects.cleanStandardList();
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
          groupKey: ['host.name'],
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
            groupKey: ['host.name'],
            role: 'parent',
          },
          schedule: { interval: '5m' },
        })
      );
    });

    it('should allow creating an esql rule with a custom id', async () => {
      const customId = 'custom-esql-rule-id';
      const { body: response } = await supertest
        .post(`/internal/rule/esql/${customId}`)
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
          groupKey: ['host.name'],
        })
        .expect(200);

      expect(response.id).toBe(customId);
    });

    it('should create a recovery rule when track.recovery is enabled', async () => {
      const { body: parentResponse } = await supertest
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
          groupKey: ['host.name'],
          track: {
            recovery: {
              enabled: true,
              recoveryQuery:
                'FROM .internal.alerts-stack.alerts-default-* | WHERE rule.id == ?rule_id',
            },
          },
        })
        .expect(200);

      expect(parentResponse).toEqual(
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
            groupKey: ['host.name'],
            role: 'parent',
          },
          internal: false,
          schedule: { interval: '5m' },
          artifacts: {
            rules: [{ id: expect.any(String) }],
            dashboards: [],
            investigation_guide: { blob: '' },
          },
        })
      );

      const recoveryRuleId = parentResponse.artifacts!.rules[0].id;
      const { body: allRules } = await supertestWithAdminScope
        .get(`/api/alerting/rules/_find`)
        .set('kbn-internal-origin', 'esqlRuleCreatorRole')
        .expect(200);

      expect(allRules.total).toBe(2);

      const { body: recoveryRuleResponse } = await supertestWithAdminScope
        .get(`/internal/alerting/rule/${recoveryRuleId}`)
        .set('kbn-internal-origin', 'esqlRuleCreatorRole')
        .expect(200);

      expect(recoveryRuleResponse).toEqual(
        expect.objectContaining({
          id: recoveryRuleId,
          name: 'abc - RECOVERY',
          tags: ['foo', 'internal'],
          actions: [],
          enabled: false,
          rule_type_id: '.esql',
          running: false,
          consumer: 'alerts',
          internal: true,
          params: {
            esqlQuery: {
              esql:
                'FROM .internal.alerts-stack.alerts-default-* | WHERE rule.id == "' +
                parentResponse.id +
                '"',
            },
            timeWindowSize: 15,
            timeWindowUnit: 'm',
            timeField: '@timestamp',
            groupKey: ['host.name'],
            parentId: parentResponse.id,
            role: 'recovery',
          },
          schedule: { interval: '5m' },
          artifacts: {
            rules: [{ id: parentResponse.id }],
            dashboards: [],
            investigation_guide: { blob: '' },
          },
        })
      );
    });
  });
}
