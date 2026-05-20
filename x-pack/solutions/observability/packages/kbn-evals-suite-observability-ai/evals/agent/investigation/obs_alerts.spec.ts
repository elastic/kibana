/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import type { RuleResponse } from '@kbn/alerting-plugin/common/routes/rule/response/types/v1';
import type { LoadResult } from '@kbn/es-snapshot-loader';
import {
  replayObservabilityDataStreams,
  cleanObservabilityDataStreams,
} from '../../../src/data_generators/replay';
import { GCS_BUCKET } from '../../../src/scenarios/constants';
import { evaluate } from '../evaluate';

const PAYMENT_UNREACHABLE_GCS = {
  bucket: GCS_BUCKET,
  basePath: 'otel-demo/payment-unreachable',
};

const SNAPSHOT_NAME = 'payment-unreachable';

const ALERTS_INDEX = '.alerts-observability.apm.alerts-default';
const ALERT_CREATION_WAIT_MS = 3000;
const INDEX_REFRESH_WAIT_MS = 2500;

// APM error count rule that fires on the payment-unreachable replay (frontend service errors)
const RULE_PARAMS = {
  consumer: 'apm',
  enabled: true,
  name: 'Error count threshold - payment unreachable (obs alerts routing test)',
  rule_type_id: 'apm.error_rate',
  tags: ['obs-alerts-routing-eval'],
  params: {
    threshold: 1,
    windowSize: 5,
    windowUnit: 'm',
    serviceName: 'frontend',
    environment: 'ENVIRONMENT_ALL',
    groupBy: ['service.name', 'service.environment'],
  },
  actions: [],
  schedule: { interval: '1m' },
};

const OBS_ALERTS_CRITERIA = [
  'Surfaces the obs alert that fired (APM error count threshold for the frontend service) with rule name and at least a count or timestamp',
  'Returns the alert results as a list or summary rather than launching a full root-cause investigation',
  'Does NOT call deep investigation tools such as observability.get_service_topology, observability.get_traces, or observability.get_log_groups — the prompt is a list/triage query, not a diagnosis request',
];

const OBS_ALERTS_EXPECTED_TOOLS = ['observability.get_alerts'];

evaluate.describe(
  'Investigation Skill: Obs Alerts Routing',
  { tag: tags.serverless.observability.complete },
  () => {
    let replayResult: LoadResult;
    let ruleId: string;

    evaluate.beforeAll(async ({ kbnClient, esClient, log }) => {
      log.info('Creating APM error rate rule for obs alerts routing test');
      const ruleResponse = await kbnClient.request<RuleResponse>({
        method: 'POST',
        path: '/api/alerting/rule',
        body: RULE_PARAMS,
      });
      ruleId = ruleResponse.data.id;

      log.info('Replaying payment-unreachable data');
      replayResult = await replayObservabilityDataStreams(
        esClient,
        log,
        SNAPSHOT_NAME,
        PAYMENT_UNREACHABLE_GCS
      );

      log.info('Triggering immediate rule evaluation');
      await kbnClient.request<void>({
        method: 'POST',
        path: `/internal/alerting/rule/${ruleId}/_run_soon`,
      });

      log.info('Waiting for alert to be created');
      await new Promise((resolve) => setTimeout(resolve, ALERT_CREATION_WAIT_MS));
      await esClient.indices.refresh({ index: ALERTS_INDEX });
      await new Promise((resolve) => setTimeout(resolve, INDEX_REFRESH_WAIT_MS));

      const alertsResponse = await esClient.search({
        index: ALERTS_INDEX,
        query: {
          bool: {
            filter: [
              { term: { 'kibana.alert.rule.uuid': ruleId } },
              { term: { 'kibana.alert.status': 'active' } },
            ],
          },
        },
        size: 1,
      });

      if (!alertsResponse.hits.hits[0]) {
        throw new Error(`No active alert produced by rule ${ruleId} for obs alerts routing eval`);
      }
      log.info('Active alert confirmed; proceeding with eval');
    });

    evaluate(
      'routes "what alerts do I have" to obs investigation across screen contexts',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'obs alerts routing across screen contexts',
            description:
              'Evaluates whether the agent routes a vague "what alerts do I have" prompt to the observability investigation skill (not security alert-analysis), and returns a list of obs alerts without launching a deep investigation. Tested across observability and neutral screen contexts.',
            examples: [
              {
                input: {
                  question: 'what alerts do i have',
                  attachments: [
                    {
                      type: 'screen_context',
                      data: {
                        app: 'observability-overview',
                        url: 'http://localhost:5601/app/observability/overview',
                        time_range: { from: 'now-24h', to: 'now' },
                      },
                      hidden: true,
                    },
                  ],
                },
                output: {
                  criteria: OBS_ALERTS_CRITERIA,
                  expectedTools: OBS_ALERTS_EXPECTED_TOOLS,
                },
                metadata: { expectedSkill: 'investigation' },
              },
              {
                input: {
                  question: 'what alerts do i have',
                  attachments: [
                    {
                      type: 'screen_context',
                      data: {
                        app: 'slo',
                        url: 'http://localhost:5601/app/slos',
                        time_range: { from: 'now-24h', to: 'now' },
                      },
                      hidden: true,
                    },
                  ],
                },
                output: {
                  criteria: OBS_ALERTS_CRITERIA,
                  expectedTools: OBS_ALERTS_EXPECTED_TOOLS,
                },
                metadata: { expectedSkill: 'investigation' },
              },
              {
                input: {
                  question: 'what alerts do i have',
                  attachments: [
                    {
                      type: 'screen_context',
                      data: {
                        app: 'discover',
                        url: "http://localhost:5601/app/discover#/?_a=(dataSource:(dataViewId:discover-observability-solution-all-logs,type:dataView),filters:!(),grid:(),interval:auto,query:(language:kuery,query:''),sort:!(!('@timestamp',desc)))&_g=(filters:!(),refreshInterval:(pause:!t,value:60000),time:(from:now-24h,to:now))",
                        time_range: { from: 'now-24h', to: 'now' },
                      },
                      hidden: true,
                    },
                  ],
                },
                output: {
                  criteria: OBS_ALERTS_CRITERIA,
                  expectedTools: OBS_ALERTS_EXPECTED_TOOLS,
                },
                metadata: { expectedSkill: 'investigation' },
              },
              {
                input: {
                  question: 'what alerts do i have',
                  attachments: [
                    {
                      type: 'screen_context',
                      data: {
                        app: 'management',
                        url: 'http://localhost:5601/app/management/insightsAndAlerting/triggersActionsAlerts',
                        time_range: { from: 'now-24h', to: 'now' },
                      },
                      hidden: true,
                    },
                  ],
                },
                output: {
                  criteria: OBS_ALERTS_CRITERIA,
                  expectedTools: OBS_ALERTS_EXPECTED_TOOLS,
                },
                metadata: { expectedSkill: 'investigation' },
              },
              {
                input: {
                  question: 'what alerts do i have',
                  attachments: [
                    {
                      type: 'screen_context',
                      data: {
                        app: 'agent_builder',
                        url: 'http://localhost:5601/app/agent_builder/agents/elastic-ai-agent/conversations/sample',
                        time_range: { from: 'now-24h', to: 'now' },
                      },
                      hidden: true,
                    },
                  ],
                },
                output: {
                  criteria: OBS_ALERTS_CRITERIA,
                  expectedTools: OBS_ALERTS_EXPECTED_TOOLS,
                },
                metadata: { expectedSkill: 'investigation' },
              },
            ],
          },
        });
      }
    );

    evaluate.afterAll(async ({ kbnClient, esClient, log }) => {
      log.debug('Cleaning up rule, alerts, and replayed data');
      await Promise.all([
        esClient.deleteByQuery({
          index: ALERTS_INDEX,
          query: { term: { 'kibana.alert.rule.uuid': ruleId } },
          conflicts: 'proceed',
          refresh: true,
        }),
        ...(ruleId
          ? [
              kbnClient.request({
                method: 'DELETE',
                path: `/api/alerting/rule/${ruleId}`,
              }),
            ]
          : []),
        cleanObservabilityDataStreams(esClient, replayResult, log),
      ]);
    });
  }
);

const NO_ALERTS_CRITERIA = [
  'Reports that no observability alerts were found rather than fabricating alerts that do not exist',
];

evaluate.describe(
  'Investigation Skill: Obs Alerts Routing - No Alerts Present',
  { tag: tags.serverless.observability.complete },
  () => {
    // No beforeAll: intentionally do not create rules or replay data.
    // This tests how the agent behaves when alert sources legitimately return empty.

    evaluate(
      'checks multiple alert sources when no alerts are present',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'obs alerts routing - no alerts present',
            description:
              'Evaluates that the investigation skill correctly handles the empty case: queries obs alerts via get_alerts and reports no obs alerts found without fabricating any.',
            examples: [
              {
                input: {
                  question: 'what alerts do i have',
                  attachments: [
                    {
                      type: 'screen_context',
                      data: {
                        app: 'observability-overview',
                        url: 'http://localhost:5601/app/observability/overview',
                        time_range: { from: 'now-24h', to: 'now' },
                      },
                      hidden: true,
                    },
                  ],
                },
                output: {
                  criteria: NO_ALERTS_CRITERIA,
                  expectedTools: ['observability.get_alerts'],
                },
                metadata: { expectedSkill: 'investigation' },
              },
              {
                input: {
                  question: 'what alerts do i have',
                  attachments: [
                    {
                      type: 'screen_context',
                      data: {
                        app: 'management',
                        url: 'http://localhost:5601/app/management/insightsAndAlerting/triggersActionsAlerts',
                        time_range: { from: 'now-24h', to: 'now' },
                      },
                      hidden: true,
                    },
                  ],
                },
                output: {
                  criteria: NO_ALERTS_CRITERIA,
                  expectedTools: ['observability.get_alerts'],
                },
                metadata: { expectedSkill: 'investigation' },
              },
              {
                input: {
                  question: 'what alerts do i have',
                  attachments: [
                    {
                      type: 'screen_context',
                      data: {
                        app: 'agent_builder',
                        url: 'http://localhost:5601/app/agent_builder/agents/elastic-ai-agent/conversations/sample',
                        time_range: { from: 'now-24h', to: 'now' },
                      },
                      hidden: true,
                    },
                  ],
                },
                output: {
                  criteria: NO_ALERTS_CRITERIA,
                  expectedTools: ['observability.get_alerts'],
                },
                metadata: { expectedSkill: 'investigation' },
              },
            ],
          },
        });
      }
    );
  }
);
