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

/** Bulk ops only include `truncated` / `totalMatched` when a filter matches more than BULK_FILTER_MAX_RULES (see @kbn/alerting-v2-schemas). */
function expectNoBulkTruncationMetadata(body: Record<string, unknown>) {
  expect(body).to.not.have.property('truncated');
  expect(body).to.not.have.property('totalMatched');
}

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

  describe('Bulk Delete Rules API', function () {
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

    it('should bulk delete multiple rules', async () => {
      const rule1 = await createRule(roleAuthc, 'bulk-delete-1');
      const rule2 = await createRule(roleAuthc, 'bulk-delete-2');

      const response = await supertestWithoutAuth
        .post(`${RULE_API_PATH}/_bulk_delete`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ ids: [rule1.id, rule2.id] });

      expect(response.status).to.be(200);
      expect(response.body.errors).to.be.an('array');
      expect(response.body.errors.length).to.be(0);
      expectNoBulkTruncationMetadata(response.body);

      // Verify rules no longer exist
      const getResponse1 = await supertestWithoutAuth
        .get(`${RULE_API_PATH}/${rule1.id}`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader());

      expect(getResponse1.status).to.be(404);

      const getResponse2 = await supertestWithoutAuth
        .get(`${RULE_API_PATH}/${rule2.id}`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader());

      expect(getResponse2.status).to.be(404);
    });

    it('should bulk delete a single rule', async () => {
      const rule = await createRule(roleAuthc, 'bulk-delete-single');

      const response = await supertestWithoutAuth
        .post(`${RULE_API_PATH}/_bulk_delete`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ ids: [rule.id] });

      expect(response.status).to.be(200);
      expect(response.body.errors).to.be.an('array');
      expect(response.body.errors.length).to.be(0);
      expectNoBulkTruncationMetadata(response.body);

      // Verify the rule no longer exists
      const getResponse = await supertestWithoutAuth
        .get(`${RULE_API_PATH}/${rule.id}`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader());

      expect(getResponse.status).to.be(404);
    });

    it('should return errors for non-existent rule ids', async () => {
      const rule = await createRule(roleAuthc, 'bulk-delete-with-missing');

      const response = await supertestWithoutAuth
        .post(`${RULE_API_PATH}/_bulk_delete`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ ids: [rule.id, 'non-existent-id'] });

      expect(response.status).to.be(200);
      expect(response.body.errors).to.be.an('array');
      expect(response.body.errors.length).to.be(1);
      expectNoBulkTruncationMetadata(response.body);
      expect(response.body.errors[0].id).to.be('non-existent-id');
      expect(response.body.errors[0].error).to.be.an('object');
      expect(response.body.errors[0].error.statusCode).to.be.a('number');

      // Valid rule should still be deleted
      const getResponse = await supertestWithoutAuth
        .get(`${RULE_API_PATH}/${rule.id}`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader());

      expect(getResponse.status).to.be(404);
    });

    it('should return 400 when ids array is empty', async () => {
      const response = await supertestWithoutAuth
        .post(`${RULE_API_PATH}/_bulk_delete`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ ids: [] });

      expect(response.status).to.be(400);
    });

    it('should not affect other rules not included in the bulk delete', async () => {
      const rule1 = await createRule(roleAuthc, 'to-delete');
      const rule2 = await createRule(roleAuthc, 'to-keep');

      const response = await supertestWithoutAuth
        .post(`${RULE_API_PATH}/_bulk_delete`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ ids: [rule1.id] });

      expect(response.status).to.be(200);
      expect(response.body.errors.length).to.be(0);
      expectNoBulkTruncationMetadata(response.body);

      // Deleted rule should not exist
      const deletedResponse = await supertestWithoutAuth
        .get(`${RULE_API_PATH}/${rule1.id}`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader());

      expect(deletedResponse.status).to.be(404);

      // Kept rule should still exist
      const keptResponse = await supertestWithoutAuth
        .get(`${RULE_API_PATH}/${rule2.id}`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader());

      expect(keptResponse.status).to.be(200);
      expect(keptResponse.body.id).to.be(rule2.id);
      expect(keptResponse.body.metadata.name).to.be('to-keep');
    });

    describe('Bulk Delete with filter', () => {
      it('should delete all rules matching the filter', async () => {
        const signalRule1 = await createRule(roleAuthc, 'signal-delete-1', { kind: 'signal' });
        const signalRule2 = await createRule(roleAuthc, 'signal-delete-2', { kind: 'signal' });
        const alertRule = await createRule(roleAuthc, 'alert-keep-1', { kind: 'alert' });

        const response = await supertestWithoutAuth
          .post(`${RULE_API_PATH}/_bulk_delete`)
          .set(roleAuthc.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ filter: 'kind: signal' });

        expect(response.status).to.be(200);
        expect(response.body.errors).to.be.an('array');
        expect(response.body.errors.length).to.be(0);
        expectNoBulkTruncationMetadata(response.body);

        // Verify signal rules are deleted
        const getResponse1 = await supertestWithoutAuth
          .get(`${RULE_API_PATH}/${signalRule1.id}`)
          .set(roleAuthc.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader());
        expect(getResponse1.status).to.be(404);

        const getResponse2 = await supertestWithoutAuth
          .get(`${RULE_API_PATH}/${signalRule2.id}`)
          .set(roleAuthc.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader());
        expect(getResponse2.status).to.be(404);

        // Verify alert rule still exists
        const keptResponse = await supertestWithoutAuth
          .get(`${RULE_API_PATH}/${alertRule.id}`)
          .set(roleAuthc.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader());
        expect(keptResponse.status).to.be(200);
        expect(keptResponse.body.id).to.be(alertRule.id);
        expect(keptResponse.body.metadata.name).to.be('alert-keep-1');
      });

      it('should return empty result when filter matches nothing', async () => {
        await createRule(roleAuthc, 'no-match-delete');

        const response = await supertestWithoutAuth
          .post(`${RULE_API_PATH}/_bulk_delete`)
          .set(roleAuthc.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({
            filter: 'metadata.name: nonexistent-rule-xyz',
          });

        expect(response.status).to.be(200);
        expect(response.body.errors).to.be.an('array');
        expect(response.body.errors.length).to.be(0);
        expectNoBulkTruncationMetadata(response.body);
      });

      it('should return 400 when both ids and filter are provided', async () => {
        const response = await supertestWithoutAuth
          .post(`${RULE_API_PATH}/_bulk_delete`)
          .set(roleAuthc.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ ids: ['some-id'], filter: 'some-filter' });

        expect(response.status).to.be(400);
      });

      it('should return 400 when neither ids nor filter nor match_all is provided', async () => {
        const response = await supertestWithoutAuth
          .post(`${RULE_API_PATH}/_bulk_delete`)
          .set(roleAuthc.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({});

        expect(response.status).to.be(400);
      });

      it('should treat match_all as targeting all rules', async () => {
        const response = await supertestWithoutAuth
          .post(`${RULE_API_PATH}/_bulk_delete`)
          .set(roleAuthc.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({ match_all: true });

        expect(response.status).to.be(200);
      });
    });
  });
}
