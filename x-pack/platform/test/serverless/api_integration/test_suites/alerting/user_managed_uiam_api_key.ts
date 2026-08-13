/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { MOCK_IDP_UIAM_ORG_ADMIN_API_KEY } from '@kbn/mock-idp-utils';
import type { FtrProviderContext } from '../../ftr_provider_context';
import type { InternalRequestHeader, RoleCredentials } from '../../../shared/services';

export default function ({ getService }: FtrProviderContext) {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const svlCommonApi = getService('svlCommonApi');
  const svlUserManager = getService('svlUserManager');
  const alertingApi = getService('alertingApi');
  const esClient = getService('es');

  // A user-created Cloud API key is presented as a raw `essu_` secret with no key id and
  // no `base64(id:key)` encoding. The mock UIAM service is pre-seeded with an org admin key.
  const uiamApiKeyHeader = { Authorization: `ApiKey ${MOCK_IDP_UIAM_ORG_ADMIN_API_KEY}` };

  describe('user-managed Cloud (UIAM) API key', function () {
    // The pre-seeded mock UIAM org admin API key only exists in the local/CI mock UIAM
    // service, not in real MKI projects.
    this.tags(['failsOnMKI']);

    const TEST_INDEX = 'user-managed-uiam-key-test-data';
    let roleAdmin: RoleCredentials;
    let internalReqHeader: InternalRequestHeader;
    let ruleId: string | undefined;

    before(async () => {
      roleAdmin = await svlUserManager.createM2mApiKeyWithRoleScope('admin');
      internalReqHeader = svlCommonApi.getInternalRequestHeader();
      await esClient.index({
        index: TEST_INDEX,
        document: { date: new Date().toISOString() },
        refresh: true,
      });
    });

    after(async () => {
      if (ruleId) {
        await supertestWithoutAuth
          .delete(`/api/alerting/rule/${ruleId}`)
          .set(internalReqHeader)
          .set(roleAdmin.apiKeyHeader);
        await esClient.deleteByQuery({
          index: '.kibana-event-log-*',
          conflicts: 'proceed',
          query: { term: { 'rule.id': ruleId } },
        });
      }
      await esClient.indices.delete({ index: TEST_INDEX }, { ignore: [404] });
      await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAdmin);
    });

    // NOTE: this test currently FAILS on the execution assertion and is expected to, until a
    // gap in core's UIAM credential handling is resolved: the core Elasticsearch cluster client
    // treats every `essu_` credential on a fake request as Kibana-minted and attaches the UIAM
    // shared secret (`x-client-authentication`, see
    // `CoreUiamService.getElasticsearchClientAuthentication` and `ClusterClient.getScopedHeaders`).
    // UIAM rejects external (user-created) keys presented with client authentication
    // (`0x1D8502`, "failed client authentication"), so the rule run fails even though the same
    // credential authenticates directly against Elasticsearch.
    it('creates a rule with a raw essu_ API key, reuses the key, and runs the rule successfully', async () => {
      const testStart = new Date();

      const response = await supertestWithoutAuth
        .post('/api/alerting/rule')
        .set(internalReqHeader)
        .set(uiamApiKeyHeader)
        .send({
          enabled: true,
          name: 'rule with user-managed uiam key',
          rule_type_id: '.es-query',
          consumer: 'alerts',
          schedule: { interval: '1m' },
          tags: [],
          actions: [],
          params: {
            size: 100,
            thresholdComparator: '>',
            threshold: [-1],
            index: [TEST_INDEX],
            timeField: 'date',
            esQuery: '{"query":{"match_all":{}}}',
            timeWindowSize: 20,
            timeWindowUnit: 's',
          },
        });

      expect(response.status).to.eql(200);
      ruleId = response.body.id;

      // The user's own key is reused as-is: marked user-managed, no key minted by alerting.
      expect(response.body.api_key_created_by_user).to.eql(true);

      // The rule must execute successfully, authenticating with the raw UIAM key.
      const eventLogResponse = await alertingApi.helpers.waiting.waitForExecutionEventLog({
        esClient,
        filter: testStart,
        ruleId: ruleId!,
      });
      const outcomes = eventLogResponse.hits.hits.map(
        (hit) => (hit._source as { event: { outcome: string } }).event.outcome
      );
      expect(outcomes).to.contain('success');
    });

    it('updates a rule using the same raw essu_ API key', async () => {
      expect(ruleId).to.be.a('string');

      const response = await supertestWithoutAuth
        .put(`/api/alerting/rule/${ruleId}`)
        .set(internalReqHeader)
        .set(uiamApiKeyHeader)
        .send({
          name: 'updated rule with user-managed uiam key',
          tags: [],
          schedule: { interval: '5m' },
          actions: [],
          params: {
            size: 100,
            thresholdComparator: '>',
            threshold: [-1],
            index: [TEST_INDEX],
            timeField: 'date',
            esQuery: '{"query":{"match_all":{}}}',
            timeWindowSize: 20,
            timeWindowUnit: 's',
          },
        });

      expect(response.status).to.eql(200);
      expect(response.body.api_key_created_by_user).to.eql(true);
      expect(response.body.name).to.eql('updated rule with user-managed uiam key');
    });
  });
}
