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

  async function createRule(
    roleAuthc: RoleCredentials,
    name: string,
    overrides: Record<string, unknown> = {}
  ) {
    const response = await supertestWithoutAuth
      .post(RULE_API_PATH)
      .set(roleAuthc.apiKeyHeader)
      .set(samlAuth.getInternalRequestHeader())
      .send({
        kind: 'alert',
        metadata: { name },
        time_field: '@timestamp',
        schedule: { every: '5m' },
        evaluation: { query: { base: 'FROM logs-* | LIMIT 10' } },
        ...overrides,
      });

    expect(response.status).to.be(200);
    return response.body;
  }

  async function getRule(roleAuthc: RoleCredentials, ruleId: string) {
    const response = await supertestWithoutAuth
      .get(`${RULE_API_PATH}/${ruleId}`)
      .set(roleAuthc.apiKeyHeader)
      .set(samlAuth.getInternalRequestHeader());

    expect(response.status).to.be(200);
    return response.body;
  }

  describe('Bulk Enable/Disable Rules API', function () {
    // alerting_v2 plugin is behind a feature flag not available on Cloud/MKI
    this.tags(['skipCloud']);
    let roleAuthc: RoleCredentials;

    before(async () => {
      await kibanaServer.savedObjects.clean({ types: [RULE_SO_TYPE] });
      roleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('admin');
    });

    afterEach(async () => {
      await kibanaServer.savedObjects.clean({ types: [RULE_SO_TYPE] });
    });

    after(async () => {
      await kibanaServer.savedObjects.clean({ types: [RULE_SO_TYPE] });
      await samlAuth.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });

    describe('Bulk Disable', () => {
      it('should bulk disable multiple enabled rules', async () => {
        const rule1 = await createRule(roleAuthc, 'disable-1');
        const rule2 = await createRule(roleAuthc, 'disable-2');

        // Newly created rules are enabled by default
        expect(rule1.enabled).to.be(true);
        expect(rule2.enabled).to.be(true);

        const response = await supertestWithoutAuth
          .post(`${RULE_API_PATH}/_bulk_disable`)
          .set(roleAuthc.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ ids: [rule1.id, rule2.id] });

        expect(response.status).to.be(200);
        expect(response.body.rules).to.be.an('array');
        expect(response.body.rules.length).to.be(2);
        expect(response.body.errors).to.be.an('array');
        expect(response.body.errors.length).to.be(0);

        for (const rule of response.body.rules) {
          expect(rule.enabled).to.be(false);
        }

        // Verify via GET that the rules are actually disabled
        const fetchedRule1 = await getRule(roleAuthc, rule1.id);
        expect(fetchedRule1.enabled).to.be(false);

        const fetchedRule2 = await getRule(roleAuthc, rule2.id);
        expect(fetchedRule2.enabled).to.be(false);
      });

      it('should handle disabling already disabled rules', async () => {
        const rule = await createRule(roleAuthc, 'already-disabled');

        // First, disable the rule
        const disableResponse1 = await supertestWithoutAuth
          .post(`${RULE_API_PATH}/_bulk_disable`)
          .set(roleAuthc.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ ids: [rule.id] });

        expect(disableResponse1.status).to.be(200);
        expect(disableResponse1.body.rules.length).to.be(1);
        expect(disableResponse1.body.rules[0].enabled).to.be(false);

        // Disable it again — should succeed without errors
        const disableResponse2 = await supertestWithoutAuth
          .post(`${RULE_API_PATH}/_bulk_disable`)
          .set(roleAuthc.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ ids: [rule.id] });

        expect(disableResponse2.status).to.be(200);
        expect(disableResponse2.body.rules.length).to.be(1);
        expect(disableResponse2.body.rules[0].enabled).to.be(false);
        expect(disableResponse2.body.errors.length).to.be(0);
      });

      it('should return errors for non-existent rule ids', async () => {
        const rule = await createRule(roleAuthc, 'disable-with-missing');

        const response = await supertestWithoutAuth
          .post(`${RULE_API_PATH}/_bulk_disable`)
          .set(roleAuthc.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ ids: [rule.id, 'non-existent-id'] });

        expect(response.status).to.be(200);
        expect(response.body.rules.length).to.be(1);
        expect(response.body.rules[0].id).to.be(rule.id);
        expect(response.body.rules[0].enabled).to.be(false);
        expect(response.body.errors.length).to.be(1);
        expect(response.body.errors[0].id).to.be('non-existent-id');
        expect(response.body.errors[0].error).to.be.an('object');
      });

      it('should return 400 when ids array is empty', async () => {
        const response = await supertestWithoutAuth
          .post(`${RULE_API_PATH}/_bulk_disable`)
          .set(roleAuthc.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ ids: [] });

        expect(response.status).to.be(400);
      });
    });

    describe('Bulk Enable', () => {
      it('should bulk enable multiple disabled rules', async () => {
        const rule1 = await createRule(roleAuthc, 'enable-1');
        const rule2 = await createRule(roleAuthc, 'enable-2');

        // Disable the rules first
        const disableResponse = await supertestWithoutAuth
          .post(`${RULE_API_PATH}/_bulk_disable`)
          .set(roleAuthc.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ ids: [rule1.id, rule2.id] });

        expect(disableResponse.status).to.be(200);
        expect(disableResponse.body.rules.length).to.be(2);

        // Re-enable the rules
        const response = await supertestWithoutAuth
          .post(`${RULE_API_PATH}/_bulk_enable`)
          .set(roleAuthc.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ ids: [rule1.id, rule2.id] });

        expect(response.status).to.be(200);
        expect(response.body.rules).to.be.an('array');
        expect(response.body.rules.length).to.be(2);
        expect(response.body.errors).to.be.an('array');
        expect(response.body.errors.length).to.be(0);

        for (const rule of response.body.rules) {
          expect(rule.enabled).to.be(true);
        }

        // Verify via GET that the rules are actually enabled
        const fetchedRule1 = await getRule(roleAuthc, rule1.id);
        expect(fetchedRule1.enabled).to.be(true);

        const fetchedRule2 = await getRule(roleAuthc, rule2.id);
        expect(fetchedRule2.enabled).to.be(true);
      });

      it('should handle enabling already enabled rules', async () => {
        const rule = await createRule(roleAuthc, 'already-enabled');

        // Rule is already enabled after creation
        expect(rule.enabled).to.be(true);

        const response = await supertestWithoutAuth
          .post(`${RULE_API_PATH}/_bulk_enable`)
          .set(roleAuthc.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ ids: [rule.id] });

        expect(response.status).to.be(200);
        expect(response.body.rules.length).to.be(1);
        expect(response.body.rules[0].enabled).to.be(true);
        expect(response.body.errors.length).to.be(0);
      });

      it('should return errors for non-existent rule ids', async () => {
        const rule = await createRule(roleAuthc, 'enable-with-missing');

        // Disable the rule first
        await supertestWithoutAuth
          .post(`${RULE_API_PATH}/_bulk_disable`)
          .set(roleAuthc.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ ids: [rule.id] });

        const response = await supertestWithoutAuth
          .post(`${RULE_API_PATH}/_bulk_enable`)
          .set(roleAuthc.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ ids: [rule.id, 'non-existent-id'] });

        expect(response.status).to.be(200);
        expect(response.body.rules.length).to.be(1);
        expect(response.body.rules[0].id).to.be(rule.id);
        expect(response.body.rules[0].enabled).to.be(true);
        expect(response.body.errors.length).to.be(1);
        expect(response.body.errors[0].id).to.be('non-existent-id');
        expect(response.body.errors[0].error).to.be.an('object');
      });

      it('should return 400 when ids array is empty', async () => {
        const response = await supertestWithoutAuth
          .post(`${RULE_API_PATH}/_bulk_enable`)
          .set(roleAuthc.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ ids: [] });

        expect(response.status).to.be(400);
      });
    });

    describe('Bulk Enable and Disable together', () => {
      it('should correctly toggle rules between enabled and disabled states', async () => {
        const rule1 = await createRule(roleAuthc, 'toggle-1');
        const rule2 = await createRule(roleAuthc, 'toggle-2');
        const rule3 = await createRule(roleAuthc, 'toggle-3');

        // All rules start enabled
        expect(rule1.enabled).to.be(true);
        expect(rule2.enabled).to.be(true);
        expect(rule3.enabled).to.be(true);

        // Disable rules 1 and 2
        const disableResponse = await supertestWithoutAuth
          .post(`${RULE_API_PATH}/_bulk_disable`)
          .set(roleAuthc.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ ids: [rule1.id, rule2.id] });

        expect(disableResponse.status).to.be(200);
        expect(disableResponse.body.rules.length).to.be(2);

        // Verify rule 3 is still enabled
        const rule3AfterDisable = await getRule(roleAuthc, rule3.id);
        expect(rule3AfterDisable.enabled).to.be(true);

        // Re-enable only rule 1
        const enableResponse = await supertestWithoutAuth
          .post(`${RULE_API_PATH}/_bulk_enable`)
          .set(roleAuthc.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ ids: [rule1.id] });

        expect(enableResponse.status).to.be(200);
        expect(enableResponse.body.rules.length).to.be(1);
        expect(enableResponse.body.rules[0].enabled).to.be(true);

        // Final state: rule1=enabled, rule2=disabled, rule3=enabled
        const finalRule1 = await getRule(roleAuthc, rule1.id);
        expect(finalRule1.enabled).to.be(true);

        const finalRule2 = await getRule(roleAuthc, rule2.id);
        expect(finalRule2.enabled).to.be(false);

        const finalRule3 = await getRule(roleAuthc, rule3.id);
        expect(finalRule3.enabled).to.be(true);
      });
    });

    describe('Bulk Disable with filter', () => {
      it('should disable all rules matching the filter', async () => {
        const alertRule1 = await createRule(roleAuthc, 'alert-disable-1', { kind: 'alert' });
        const alertRule2 = await createRule(roleAuthc, 'alert-disable-2', { kind: 'alert' });
        const signalRule = await createRule(roleAuthc, 'signal-disable-1', { kind: 'signal' });

        // All rules start enabled
        expect(alertRule1.enabled).to.be(true);
        expect(alertRule2.enabled).to.be(true);
        expect(signalRule.enabled).to.be(true);

        // Disable only alert rules via filter
        const response = await supertestWithoutAuth
          .post(`${RULE_API_PATH}/_bulk_disable`)
          .set(roleAuthc.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ filter: 'kind: alert' });

        expect(response.status).to.be(200);
        expect(response.body.errors).to.be.an('array');
        expect(response.body.errors.length).to.be(0);

        const disabledIds = response.body.rules.map((r: { id: string }) => r.id);
        expect(disabledIds).to.contain(alertRule1.id);
        expect(disabledIds).to.contain(alertRule2.id);
        expect(disabledIds).not.to.contain(signalRule.id);

        // Verify alert rules are disabled
        const fetched1 = await getRule(roleAuthc, alertRule1.id);
        expect(fetched1.enabled).to.be(false);

        const fetched2 = await getRule(roleAuthc, alertRule2.id);
        expect(fetched2.enabled).to.be(false);

        // Verify signal rule is still enabled
        const fetchedSignal = await getRule(roleAuthc, signalRule.id);
        expect(fetchedSignal.enabled).to.be(true);
      });

      it('should return 400 when both ids and filter are provided', async () => {
        const response = await supertestWithoutAuth
          .post(`${RULE_API_PATH}/_bulk_disable`)
          .set(roleAuthc.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ ids: ['some-id'], filter: 'some-filter' });

        expect(response.status).to.be(400);
      });

      it('should return 400 when neither ids nor filter is provided', async () => {
        const response = await supertestWithoutAuth
          .post(`${RULE_API_PATH}/_bulk_disable`)
          .set(roleAuthc.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({});

        expect(response.status).to.be(400);
      });
    });

    describe('Bulk Enable with filter', () => {
      it('should enable all rules matching the filter', async () => {
        const signalRule1 = await createRule(roleAuthc, 'signal-enable-1', { kind: 'signal' });
        const signalRule2 = await createRule(roleAuthc, 'signal-enable-2', { kind: 'signal' });
        const alertRule = await createRule(roleAuthc, 'alert-enable-1', { kind: 'alert' });

        // Disable all rules first
        await supertestWithoutAuth
          .post(`${RULE_API_PATH}/_bulk_disable`)
          .set(roleAuthc.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ ids: [signalRule1.id, signalRule2.id, alertRule.id] });

        // Enable only signal rules via filter
        const response = await supertestWithoutAuth
          .post(`${RULE_API_PATH}/_bulk_enable`)
          .set(roleAuthc.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ filter: 'kind: signal' });

        expect(response.status).to.be(200);
        expect(response.body.errors).to.be.an('array');
        expect(response.body.errors.length).to.be(0);

        const enabledIds = response.body.rules.map((r: { id: string }) => r.id);
        expect(enabledIds).to.contain(signalRule1.id);
        expect(enabledIds).to.contain(signalRule2.id);
        expect(enabledIds).not.to.contain(alertRule.id);

        // Verify signal rules are enabled
        const fetched1 = await getRule(roleAuthc, signalRule1.id);
        expect(fetched1.enabled).to.be(true);

        const fetched2 = await getRule(roleAuthc, signalRule2.id);
        expect(fetched2.enabled).to.be(true);

        // Verify alert rule is still disabled
        const fetchedAlert = await getRule(roleAuthc, alertRule.id);
        expect(fetchedAlert.enabled).to.be(false);
      });

      it('should return empty results when filter matches nothing', async () => {
        await createRule(roleAuthc, 'no-match-rule');

        const response = await supertestWithoutAuth
          .post(`${RULE_API_PATH}/_bulk_enable`)
          .set(roleAuthc.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({
            filter: 'kind: nonexistent',
          });

        expect(response.status).to.be(200);
        expect(response.body.rules).to.be.an('array');
        expect(response.body.rules.length).to.be(0);
        expect(response.body.errors.length).to.be(0);
      });

      it('should return 400 when both ids and filter are provided', async () => {
        const response = await supertestWithoutAuth
          .post(`${RULE_API_PATH}/_bulk_enable`)
          .set(roleAuthc.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ ids: ['some-id'], filter: 'some-filter' });

        expect(response.status).to.be(400);
      });

      it('should return 400 when neither ids nor filter is provided', async () => {
        const response = await supertestWithoutAuth
          .post(`${RULE_API_PATH}/_bulk_enable`)
          .set(roleAuthc.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({});

        expect(response.status).to.be(400);
      });
    });
  });
}
