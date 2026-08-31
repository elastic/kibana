/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Reproduces the APM Alerts table "View in App" (eye icon) truncating
 * service.name, service.environment, and transaction.type to their first
 * character. The stored alert documents keep the full values; the client-side
 * formatter indexes `[0]` after the platform hook has already unwrapped arrays
 * to scalars.
 *
 * Data types:
 * - APM transactions + errors for a multi-character service / environment /
 *   transaction.type (so a fixed View in App URL can land on a real service).
 * - One active APM alert document per rule type (error count, transaction
 *   duration, transaction error rate, anomaly) with those same full field values.
 *
 * Related:
 * - https://github.com/elastic/kibana/issues/286126
 *
 * Run:
 *   node scripts/synthtrace apm_view_in_app_truncation --from now-1w --to now
 *
 * Manual live run (optional, stop with Ctrl+C):
 *   node scripts/synthtrace apm_view_in_app_truncation --live --from now-1w --to now
 *
 * Scenario options:
 * - rpm (number, default: 2): transactions per minute
 * - serviceName (string, default: synthtrace_fabric_aggregation)
 * - transactionType (string, default: request)
 * - transactionName (string, default: GET /synthtrace/overview)
 *
 * How to verify in Kibana (this is the platform table, not Observability → Alerts):
 * 1. Stack Management → Alerts
 *    (`/app/management/insightsAndAlerting/triggersActionsAlerts`)
 *    NOT `/triggersActions/alerts` (that is the Rules page).
 *    OR Rules → open `Synthtrace View in App | APM Anomaly` → Alerts tab
 *    (`/app/management/insightsAndAlerting/triggersActions/rule/synthtrace-apm-view-in-app-anomaly`)
 * 2. Click the eye icon (data-test-subj="viewInAppAlertAction").
 * 3. Unfixed: `/app/apm/services/s?transactionType=r&environment=S`
 *    (look at the address bar). Error-count: `/app/apm/services/s/errors?environment=S`.
 * 4. Fixed: full `serviceName`, environment, and `transactionType`.
 *
 * Observability → Alerts will NOT reproduce this. That table uses parseAlert,
 * which still passes Elasticsearch arrays into format(), so `[0]` is a no-op
 * and the URL stays correct even without the fix. The bug is useViewInAppUrl
 * unwrapping those arrays to scalars *before* format() runs.
 *
 * Validation:
 * - traces-apm* has `service.name` / `service.environment` / `transaction.type`
 *   with multi-character values.
 * - `.alerts-observability.apm.alerts-*` has four active alerts whose
 *   `kibana.alert.rule.rule_type_id` is each APM rule type, with the same
 *   full field values (not truncated).
 */

import type { Client } from '@elastic/elasticsearch';
import type { ApmFields } from '@kbn/synthtrace-client';
import { apm } from '@kbn/synthtrace-client';
import type { Logger, Scenario } from '@kbn/synthtrace';
import { getNumberOpt, getStringOpt, getSynthtraceEnvironment, withClient } from '@kbn/synthtrace';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);
const ALERT_INDEX = '.internal.alerts-observability.apm.alerts-default-000001';
const RULE_TAG = 'synthtrace-apm-view-in-app';

const DEFAULT_SCENARIO_OPTS = {
  rpm: 2,
  serviceName: 'synthtrace_fabric_aggregation',
  transactionType: 'request',
  transactionName: 'GET /synthtrace/overview',
};

const APM_RULE_TYPES = [
  {
    id: 'apm.error_rate',
    ruleId: 'synthtrace-apm-view-in-app-error-count',
    category: 'Error count threshold',
    reasonSuffix: 'Error count is above the threshold',
    processorEvent: 'error',
    params: (opts: typeof DEFAULT_SCENARIO_OPTS) => ({
      threshold: 1,
      windowSize: 5,
      windowUnit: 'm',
      environment: ENVIRONMENT,
      serviceName: opts.serviceName,
      groupBy: ['service.name', 'service.environment', 'transaction.type'],
    }),
  },
  {
    id: 'apm.transaction_duration',
    ruleId: 'synthtrace-apm-view-in-app-tx-duration',
    category: 'Latency threshold',
    reasonSuffix: 'Avg. latency is above the threshold',
    processorEvent: 'transaction',
    params: (opts: typeof DEFAULT_SCENARIO_OPTS) => ({
      threshold: 1,
      windowSize: 5,
      windowUnit: 'm',
      aggregationType: 'avg',
      environment: ENVIRONMENT,
      serviceName: opts.serviceName,
      transactionType: opts.transactionType,
      groupBy: ['service.name', 'service.environment', 'transaction.type'],
    }),
  },
  {
    id: 'apm.transaction_error_rate',
    ruleId: 'synthtrace-apm-view-in-app-tx-error-rate',
    category: 'Failed transaction rate threshold',
    reasonSuffix: 'Failed transaction rate is above the threshold',
    processorEvent: 'transaction',
    params: (opts: typeof DEFAULT_SCENARIO_OPTS) => ({
      threshold: 1,
      windowSize: 5,
      windowUnit: 'm',
      environment: ENVIRONMENT,
      serviceName: opts.serviceName,
      transactionType: opts.transactionType,
      groupBy: ['service.name', 'service.environment', 'transaction.type'],
    }),
  },
  {
    id: 'apm.anomaly',
    ruleId: 'synthtrace-apm-view-in-app-anomaly',
    category: 'APM Anomaly',
    reasonSuffix: 'critical latency anomaly was detected',
    processorEvent: 'transaction',
    params: (opts: typeof DEFAULT_SCENARIO_OPTS) => ({
      windowSize: 30,
      windowUnit: 'm',
      environment: ENVIRONMENT,
      serviceName: opts.serviceName,
      transactionType: opts.transactionType,
      anomalySeverityType: 'critical',
      anomalyDetectorTypes: ['txLatency'],
    }),
  },
] as const;

function assertNoUnknownScenarioOpts(opts: Record<string, unknown>) {
  const unknown = Object.keys(opts).filter((k) => !(k in DEFAULT_SCENARIO_OPTS));
  if (unknown.length) {
    throw new Error(`Unknown scenarioOpts: ${unknown.join(', ')}`);
  }
}

function parseOpts(
  scenarioOpts: Record<string, unknown> | undefined
): typeof DEFAULT_SCENARIO_OPTS {
  const opts = scenarioOpts ?? {};
  assertNoUnknownScenarioOpts(opts);

  return {
    rpm: getNumberOpt(opts, 'rpm', DEFAULT_SCENARIO_OPTS.rpm),
    serviceName: getStringOpt(opts, 'serviceName') ?? DEFAULT_SCENARIO_OPTS.serviceName,
    transactionType: getStringOpt(opts, 'transactionType') ?? DEFAULT_SCENARIO_OPTS.transactionType,
    transactionName: getStringOpt(opts, 'transactionName') ?? DEFAULT_SCENARIO_OPTS.transactionName,
  };
}

function isNotFoundError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'statusCode' in err && err.statusCode === 404;
}

interface AlertingRuleResponse {
  id: string;
  name: string;
}

interface SynthtraceKibanaClient {
  fetch: <T>(pathname: string, options: RequestInit) => Promise<T>;
}

async function upsertDisabledRule({
  kibanaClient,
  ruleId,
  ruleTypeId,
  name,
  params,
}: {
  kibanaClient: SynthtraceKibanaClient;
  ruleId: string;
  ruleTypeId: string;
  name: string;
  params: Record<string, unknown>;
}): Promise<AlertingRuleResponse> {
  try {
    return await kibanaClient.fetch<AlertingRuleResponse>(`/api/alerting/rule/${ruleId}`, {
      method: 'GET',
    });
  } catch (err) {
    if (!isNotFoundError(err)) {
      throw err;
    }
  }

  return kibanaClient.fetch<AlertingRuleResponse>(`/api/alerting/rule/${ruleId}`, {
    method: 'POST',
    body: JSON.stringify({
      name,
      rule_type_id: ruleTypeId,
      consumer: 'apm',
      enabled: false,
      schedule: { interval: '1m' },
      tags: [RULE_TAG],
      params,
    }),
  });
}

async function resolveApmAlertsIndex(esClient: Client): Promise<string> {
  try {
    const indices = await esClient.cat.indices({
      index:
        '.internal.alerts-observability.apm.alerts-default-*,.alerts-observability.apm.alerts-default',
      format: 'json',
      h: 'index',
    });
    const names = (indices as Array<{ index: string }>).map((row) => row.index);
    const internal = names.find((name) =>
      name.startsWith('.internal.alerts-observability.apm.alerts-default-')
    );
    if (internal) {
      return internal;
    }
    if (names.includes('.alerts-observability.apm.alerts-default')) {
      return '.alerts-observability.apm.alerts-default';
    }
  } catch {
    // Index may not exist yet; fall back to the stateful backing index.
  }
  return ALERT_INDEX;
}

async function seedApmViewInAppAlerts({
  kibanaClient,
  esClient,
  logger,
  opts,
}: {
  kibanaClient: SynthtraceKibanaClient;
  esClient: Client;
  logger: Logger;
  opts: typeof DEFAULT_SCENARIO_OPTS;
}): Promise<void> {
  const now = new Date().toISOString();
  const alertIndex = await resolveApmAlertsIndex(esClient);

  for (const ruleType of APM_RULE_TYPES) {
    const name = `Synthtrace View in App | ${ruleType.category} | ${opts.serviceName}`;
    const rule = await upsertDisabledRule({
      kibanaClient,
      ruleId: ruleType.ruleId,
      ruleTypeId: ruleType.id,
      name,
      params: ruleType.params(opts),
    });

    await esClient.index({
      index: alertIndex,
      id: `synthtrace-apm-view-in-app-${ruleType.id}`,
      refresh: 'wait_for',
      document: {
        '@timestamp': now,
        'kibana.alert.uuid': `synthtrace-apm-view-in-app-${ruleType.id}`,
        'kibana.alert.start': now,
        'kibana.alert.status': 'active',
        'kibana.alert.workflow_status': 'open',
        'kibana.alert.rule.name': rule.name,
        'kibana.alert.rule.uuid': rule.id,
        'kibana.alert.rule.rule_type_id': ruleType.id,
        'kibana.alert.rule.category': ruleType.category,
        'kibana.alert.rule.consumer': 'apm',
        'kibana.alert.rule.producer': 'apm',
        'kibana.alert.reason': `${ruleType.reasonSuffix} for ${opts.serviceName} (${ENVIRONMENT}, ${opts.transactionType})`,
        'kibana.alert.evaluation.threshold': 1,
        'kibana.alert.evaluation.value': 50,
        'kibana.alert.duration.us': 0,
        'kibana.alert.time_range': { gte: now },
        'kibana.alert.instance.id': `${opts.serviceName}_${opts.transactionType}`,
        'service.name': opts.serviceName,
        'service.environment': ENVIRONMENT,
        'transaction.type': opts.transactionType,
        'processor.event': ruleType.processorEvent,
        'kibana.space_ids': ['default'],
        'event.kind': 'signal',
        'event.action': 'open',
        tags: ['apm', RULE_TAG],
      },
    });

    logger.info(`Indexed ${ruleType.id} alert into ${alertIndex} for ${opts.serviceName}`);
  }
}

const scenario: Scenario<ApmFields> = async (runOptions) => {
  const opts = parseOpts(runOptions.scenarioOpts);

  return {
    generate: ({ range, clients: { apmEsClient } }) => {
      const instance = apm
        .service({
          name: opts.serviceName,
          environment: ENVIRONMENT,
          agentName: 'nodejs',
        })
        .instance(`${opts.serviceName}-instance`);

      const traces = range.ratePerMinute(opts.rpm).generator((timestamp) => {
        const failed = timestamp % 2 === 0;
        const tx = instance
          .transaction(opts.transactionName, opts.transactionType)
          .timestamp(timestamp)
          .duration(failed ? 1800 : 250);

        if (failed) {
          return tx
            .failure()
            .errors(
              instance
                .error({ message: 'synthtrace view-in-app sample error', type: 'Error' })
                .timestamp(timestamp)
            );
        }

        return tx.success();
      });

      return withClient(apmEsClient, traces);
    },
    teardown: async (_clients, kibanaClient, esClient) => {
      await seedApmViewInAppAlerts({
        kibanaClient,
        esClient,
        logger: runOptions.logger,
        opts,
      });
    },
  };
};

export default scenario;
