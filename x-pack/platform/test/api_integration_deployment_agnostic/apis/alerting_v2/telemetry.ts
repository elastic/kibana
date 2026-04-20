/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { SerializedConcreteTaskInstance } from '@kbn/task-manager-plugin/server/task';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import type { RoleCredentials } from '../../services';

const RULE_API_PATH = '/api/alerting/v2/rules';
const NOTIFICATION_POLICY_API_PATH = '/api/alerting/v2/notification_policies';
const RULE_SO_TYPE = 'alerting_rule';
const NOTIFICATION_POLICY_SO_TYPE = 'alerting_notification_policy';
const TELEMETRY_TASK_ID = 'AlertingV2-alerting_v2_telemetry';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const samlAuth = getService('samlAuth');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const kibanaServer = getService('kibanaServer');
  const retry = getService('retry');
  const es = getService('es');

  describe('Alerting V2 Telemetry', function () {
    this.tags(['skipCloud']);
    let roleAuthc: RoleCredentials;

    before(async () => {
      await kibanaServer.savedObjects.clean({
        types: [RULE_SO_TYPE, NOTIFICATION_POLICY_SO_TYPE],
      });
      roleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('admin');

      // Create rules with various configurations
      const ruleResults = await Promise.all([
        // Rule 1: alert kind, 1m schedule, with grouping and no_data
        supertestWithoutAuth
          .post(RULE_API_PATH)
          .set(roleAuthc.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({
            kind: 'alert',
            metadata: { name: 'alert-rule-1' },
            time_field: '@timestamp',
            schedule: { every: '1m', lookback: '5m' },
            evaluation: {
              query: { base: 'FROM metrics-* | LIMIT 10' },
            },
            grouping: { fields: ['host.name', 'service.name'] },
            no_data: { behavior: 'last_status', timeframe: '10m' },
          }),
        // Rule 2: signal kind, 5m schedule, with recovery policy
        supertestWithoutAuth
          .post(RULE_API_PATH)
          .set(roleAuthc.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({
            kind: 'signal',
            metadata: { name: 'signal-rule-1' },
            time_field: '@timestamp',
            schedule: { every: '5m' },
            evaluation: {
              query: { base: 'FROM logs-* | LIMIT 10' },
            },
            recovery_policy: { type: 'no_breach' },
          }),
        // Rule 3: alert kind, 5m schedule, disabled
        supertestWithoutAuth
          .post(RULE_API_PATH)
          .set(roleAuthc.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({
            kind: 'alert',
            metadata: { name: 'alert-rule-2' },
            time_field: '@timestamp',
            schedule: { every: '5m', lookback: '10m' },
            evaluation: { query: { base: 'FROM metrics-* | LIMIT 5' } },
            no_data: { behavior: 'recover', timeframe: '15m' },
          }),
      ]);

      for (const result of ruleResults) {
        expect(result.status).to.be(200);
      }

      // Disable rule 3
      const rule3Id = ruleResults[2].body.id;
      const disableResponse = await supertestWithoutAuth
        .post(`${RULE_API_PATH}/_bulk_disable`)
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ ids: [rule3Id] });
      expect(disableResponse.status).to.be(200);

      // Create notification policies
      const policyResults = await Promise.all([
        // Policy 1: with matcher, groupBy, throttle
        supertestWithoutAuth
          .post(NOTIFICATION_POLICY_API_PATH)
          .set(roleAuthc.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({
            name: 'policy-1',
            description: 'policy-1 description',
            destinations: [{ type: 'workflow', id: 'workflow-1' }],
            matcher: "env == 'production'",
            groupBy: ['service.name', 'environment'],
            throttle: { interval: '5m' },
          }),
        // Policy 2: different workflow, no matcher, different throttle
        supertestWithoutAuth
          .post(NOTIFICATION_POLICY_API_PATH)
          .set(roleAuthc.apiKeyHeader)
          .set(samlAuth.getInternalRequestHeader())
          .send({
            name: 'policy-2',
            description: 'policy-2 description',
            destinations: [{ type: 'workflow', id: 'workflow-2' }],
            throttle: { interval: '1h' },
          }),
      ]);

      for (const result of policyResults) {
        expect(result.status).to.be(200);
      }
    });

    after(async () => {
      await kibanaServer.savedObjects.clean({
        types: [RULE_SO_TYPE, NOTIFICATION_POLICY_SO_TYPE],
      });
      await samlAuth.invalidateM2mApiKeyWithRoleScope(roleAuthc);
    });

    it('should retrieve telemetry data in the expected format', async () => {
      // Request the telemetry task to run immediately
      await supertestWithoutAuth
        .post('/api/alerting_v2_fixture_telemetry/run_soon')
        .set(roleAuthc.apiKeyHeader)
        .set(samlAuth.getInternalRequestHeader())
        .send({ taskId: TELEMETRY_TASK_ID })
        .expect(200);

      // Wait for the task to complete and verify the state
      await retry.try(async () => {
        const telemetryTask = await es.get<{
          type: string;
          task: SerializedConcreteTaskInstance;
        }>({
          id: `task:${TELEMETRY_TASK_ID}`,
          index: '.kibana_task_manager',
        });

        expect(telemetryTask._source!.task?.status).to.be('idle');
        const taskState = telemetryTask._source!.task?.state;
        expect(taskState).not.to.be(undefined);
        const parsedState = JSON.parse(taskState!);

        // Verify task has run at least once
        expect(parsedState.runs > 0).to.be(true);
        expect(parsedState.has_errors).to.be(false);

        // Rule stats
        expect(parsedState.count_total).to.be(3);
        expect(parsedState.count_enabled).to.be(2);
        expect(parsedState.count_by_kind).to.eql({ alert: 2, signal: 1 });
        expect(
          [...parsedState.count_by_schedule].sort((a: { name: string }, b: { name: string }) =>
            a.name.localeCompare(b.name)
          )
        ).to.eql([
          { name: '1m', value: 1 },
          { name: '5m', value: 2 },
        ]);
        expect(
          [...parsedState.count_by_lookback].sort((a: { name: string }, b: { name: string }) =>
            a.name.localeCompare(b.name)
          )
        ).to.eql([
          { name: '10m', value: 1 },
          { name: '5m', value: 1 },
        ]);
        expect(parsedState.count_with_recovery_policy).to.be(1);
        expect(parsedState.count_by_recovery_policy_type).to.eql({ no_breach: 1 });
        expect(parsedState.count_with_grouping).to.be(1);
        expect(parsedState.avg_grouping_fields_count).to.be(2);
        expect(parsedState.count_with_no_data).to.be(2);
        expect(parsedState.count_by_no_data_behavior).to.eql({ recover: 1, last_status: 1 });
        expect(
          [...parsedState.count_by_no_data_timeframe].sort(
            (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name)
          )
        ).to.eql([
          { name: '10m', value: 1 },
          { name: '15m', value: 1 },
        ]);
        expect(parsedState.min_created_at).to.be.a('string');

        // Execution stats
        expect(parsedState.executions_count_24hr).to.be.a('number');
        expect(parsedState.executions_count_by_status_24hr).to.be.an('object');
        expect(parsedState.executions_delay_p50_ms).to.not.be(undefined);
        expect(parsedState.executions_delay_p75_ms).to.not.be(undefined);
        expect(parsedState.executions_delay_p95_ms).to.not.be(undefined);
        expect(parsedState.executions_delay_p99_ms).to.not.be(undefined);
        expect(parsedState.dispatcher_executions_count_24hr).to.be.a('number');

        // Notification policy stats
        expect(parsedState.notification_policies_count).to.be(2);
        expect(parsedState.notification_policies_unique_workflow_count).to.be(2);
        expect(parsedState.notification_policies_count_with_matcher).to.be(1);
        expect(parsedState.notification_policies_count_with_group_by).to.be(1);
        expect(parsedState.notification_policies_avg_group_by_fields_count).to.be(2);
        expect(
          [...parsedState.notification_policies_count_by_throttle_interval].sort(
            (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name)
          )
        ).to.eql([
          { name: '1h', value: 1 },
          { name: '5m', value: 1 },
        ]);
      });
    });
  });
}
