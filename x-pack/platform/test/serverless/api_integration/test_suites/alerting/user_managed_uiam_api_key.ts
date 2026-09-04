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
    const ACTION_INDEX = 'user-managed-uiam-key-action-output';
    let roleAdmin: RoleCredentials;
    let internalReqHeader: InternalRequestHeader;
    let ruleId: string | undefined;
    let ruleWithActionId: string | undefined;
    let connectorId: string | undefined;

    // Reads the raw rule saved object so tests can assert exactly which credential
    // attributes are persisted. `apiKey`/`uiamApiKey` are ESO-encrypted, so only their
    // presence/absence is asserted; `uiamApiKeyExternal` is plaintext.
    const getRuleSoAttributes = async (id: string) => {
      const response = await esClient.search({
        index: '.kibana_alerting_cases*',
        query: { ids: { values: [`alert:${id}`] } },
      });
      expect(response.hits.hits.length).to.eql(1);
      return (response.hits.hits[0]._source as { alert: Record<string, unknown> }).alert;
    };

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
      for (const idToDelete of [ruleId, ruleWithActionId]) {
        if (!idToDelete) continue;
        await supertestWithoutAuth
          .delete(`/api/alerting/rule/${idToDelete}`)
          .set(internalReqHeader)
          .set(roleAdmin.apiKeyHeader);
        await esClient.deleteByQuery({
          index: '.kibana-event-log-*',
          conflicts: 'proceed',
          query: { term: { 'rule.id': idToDelete } },
        });
      }
      if (connectorId) {
        await supertestWithoutAuth
          .delete(`/api/actions/connector/${connectorId}`)
          .set(internalReqHeader)
          .set(roleAdmin.apiKeyHeader);
      }
      await esClient.indices.delete({ index: TEST_INDEX }, { ignore: [404] });
      await esClient.indices.delete({ index: ACTION_INDEX }, { ignore: [404] });
      await svlUserManager.invalidateM2mApiKeyWithRoleScope(roleAdmin);
    });

    // Execution success depends on the rule persisting UIAM's externality verdict
    // (`uiamApiKeyExternal`, captured from `AuthenticatedUser.api_key.internal === false` at
    // creation) and the rule run's fake request being marked via `markExternalUiamCredential`
    // (see `getFakeKibanaRequest` in `rule_loader.ts`): UIAM rejects external (user-created) API
    // keys presented with client authentication, so the Elasticsearch cluster client must not
    // attach the UIAM shared secret to this credential.
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

    // The connector task authenticates with the rule's raw key too: the `uiamApiKeyExternal`
    // flag persisted on `action_task_params` makes the actions plugin mark its fake request via
    // `markExternalUiamCredential` (see `getFakeRequest` in the actions `task_runner_factory.ts`),
    // the same way the rule run itself does.
    it('runs connector actions of a rule created with a raw essu_ API key', async () => {
      const createdConnector = await alertingApi.helpers.createIndexConnector({
        roleAuthc: roleAdmin,
        name: 'index connector for user-managed uiam key test',
        indexName: ACTION_INDEX,
      });
      connectorId = createdConnector.id;

      const response = await supertestWithoutAuth
        .post('/api/alerting/rule')
        .set(internalReqHeader)
        .set(uiamApiKeyHeader)
        .send({
          enabled: true,
          name: 'rule with action and user-managed uiam key',
          rule_type_id: '.es-query',
          consumer: 'alerts',
          schedule: { interval: '1m' },
          tags: [],
          actions: [
            {
              group: 'query matched',
              id: connectorId,
              params: {
                documents: [{ ruleId: '{{rule.id}}', ruleName: '{{rule.name}}', date: '{{date}}' }],
              },
              frequency: {
                notify_when: 'onActiveAlert',
                throttle: null,
                summary: false,
              },
            },
          ],
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
      ruleWithActionId = response.body.id;
      expect(response.body.api_key_created_by_user).to.eql(true);

      // The connector must execute successfully, authenticating with the raw UIAM key.
      const documentResponse = await alertingApi.helpers.waitForDocumentInIndex({
        esClient,
        indexName: ACTION_INDEX,
        ruleId: ruleWithActionId!,
        retryOptions: { retryCount: 12, retryDelay: 2000 },
      });
      expect(documentResponse.hits.hits.length).to.be.greaterThan(0);
      expect((documentResponse.hits.hits[0]._source as { ruleName: string }).ruleName).to.eql(
        'rule with action and user-managed uiam key'
      );
    });

    // Alerting-minted Elasticsearch API keys are named `Alerting: <ruleTypeId>/<rule name>`
    // (see `generateAPIKeyName`). Both rules in this suite were created with the raw key, so
    // no such key may exist — the user's key is reused as-is and nothing is minted (no org
    // API key quota impact).
    it('does not mint any Elasticsearch API keys for rules created with the raw key', async () => {
      const apiKeysResponse = await esClient.security.queryApiKeys({
        query: { wildcard: { name: '*user-managed uiam key*' } },
      });
      expect(apiKeysResponse.total).to.eql(0);
    });

    it('persists the raw key UIAM-only with the external verdict on the rule saved object', async () => {
      expect(ruleId).to.be.a('string');

      const attributes = await getRuleSoAttributes(ruleId!);
      // The raw `essu_` secret is stored on `uiamApiKey` (encrypted); no ES key exists.
      expect(attributes.uiamApiKey).to.be.a('string');
      expect(attributes.apiKey == null).to.be(true);
      // UIAM's externality verdict, captured at creation, drives the run-time decision to
      // withhold the shared secret. Without it the rule run would fail with 401 0x1D8502.
      expect(attributes.uiamApiKeyExternal).to.eql(true);
      expect(attributes.apiKeyCreatedByUser).to.eql(true);
    });

    it('disables and re-enables the rule with the raw key and the rule runs again', async () => {
      expect(ruleId).to.be.a('string');

      await supertestWithoutAuth
        .post(`/api/alerting/rule/${ruleId}/_disable`)
        .set(internalReqHeader)
        .set(uiamApiKeyHeader)
        .expect(204);

      const enableTime = new Date();
      await supertestWithoutAuth
        .post(`/api/alerting/rule/${ruleId}/_enable`)
        .set(internalReqHeader)
        .set(uiamApiKeyHeader)
        .expect(204);

      // The enable path re-persists the raw key and its externality verdict.
      const attributes = await getRuleSoAttributes(ruleId!);
      expect(attributes.uiamApiKey).to.be.a('string');
      expect(attributes.uiamApiKeyExternal).to.eql(true);
      expect(attributes.apiKeyCreatedByUser).to.eql(true);

      // Enabling schedules an immediate run; it must succeed with the raw key.
      const eventLogResponse = await alertingApi.helpers.waiting.waitForExecutionEventLog({
        esClient,
        filter: enableTime,
        ruleId: ruleId!,
      });
      const outcomes = eventLogResponse.hits.hits.map(
        (hit) => (hit._source as { event: { outcome: string } }).event.outcome
      );
      expect(outcomes).to.contain('success');
    });

    // Rotating the credential must fully replace the UIAM attributes: a stale
    // `uiamApiKeyExternal: true` next to a non-external key would make the cluster client
    // withhold the shared secret from a credential that needs it.
    it('switches to a user-supplied Elasticsearch API key and strips the UIAM attributes', async () => {
      expect(ruleId).to.be.a('string');

      const response = await supertestWithoutAuth
        .put(`/api/alerting/rule/${ruleId}`)
        .set(internalReqHeader)
        .set(roleAdmin.apiKeyHeader)
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
      // The caller's ES API key is reused, so the rule stays user-managed.
      expect(response.body.api_key_created_by_user).to.eql(true);

      const attributes = await getRuleSoAttributes(ruleId!);
      expect(attributes.apiKey).to.be.a('string');
      expect(attributes.uiamApiKey == null).to.be(true);
      expect(attributes.uiamApiKeyExternal == null).to.be(true);
    });

    it('restores the raw key via the update API key endpoint', async () => {
      expect(ruleId).to.be.a('string');

      await supertestWithoutAuth
        .post(`/api/alerting/rule/${ruleId}/_update_api_key`)
        .set(internalReqHeader)
        .set(uiamApiKeyHeader)
        .expect(204);

      const attributes = await getRuleSoAttributes(ruleId!);
      expect(attributes.uiamApiKey).to.be.a('string');
      expect(attributes.uiamApiKeyExternal).to.eql(true);
      expect(attributes.apiKey == null).to.be(true);
    });

    it('deleting the rule with the raw key leaves the key valid', async () => {
      expect(ruleId).to.be.a('string');
      const deletedRuleId = ruleId!;

      await supertestWithoutAuth
        .delete(`/api/alerting/rule/${deletedRuleId}`)
        .set(internalReqHeader)
        .set(uiamApiKeyHeader)
        .expect(204);

      // 404 (not 401) proves the key still authenticates after the rule is gone. Alerting
      // never enqueues user-created keys for invalidation (the pending-invalidation entry is
      // skipped at the source), so the key remains the user's to manage.
      await supertestWithoutAuth
        .get(`/api/alerting/rule/${deletedRuleId}`)
        .set(internalReqHeader)
        .set(uiamApiKeyHeader)
        .expect(404);

      await esClient.deleteByQuery({
        index: '.kibana-event-log-*',
        conflicts: 'proceed',
        query: { term: { 'rule.id': deletedRuleId } },
      });
      // Already cleaned up; the after hook should skip it.
      ruleId = undefined;
    });
  });
}
