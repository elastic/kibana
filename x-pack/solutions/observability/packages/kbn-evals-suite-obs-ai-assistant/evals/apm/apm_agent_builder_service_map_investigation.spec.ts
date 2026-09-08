/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Eval coverage for the `investigate-service-map` skill (issue #288292):
 *
 * The skill is triggered when the user starts a conversation from the APM
 * service map page. In the product, an `observability.service-map-context`
 * attachment carries the view filters; the eval chat client cannot attach
 * attachments, so these examples mirror the button's auto-sent prompt and
 * spell the view filters out inline (same information the attachment carries).
 *
 * Output contract under test:
 *   1. Issues found — ordered by severity (alerts > SLOs > anomalies > structural)
 *   2. Architecture explanation (entry points, hubs, datastores, external deps)
 *   3. observability.service-map attachment (focused via serviceName)
 *   4. Links — deep links to problem services and their alerts
 *
 * Run with:
 *   EVALUATION_CLIENT=agent_builder \
 *   AGENT_BUILDER_AGENT_ID=<agent-id> \
 *   EVALUATION_CONNECTOR_ID=<judge-connector-id> \
 *   node scripts/playwright test \
 *     --config x-pack/solutions/observability/packages/kbn-evals-suite-obs-ai-assistant/playwright.config.ts \
 *     evals/apm/apm_agent_builder_service_map_investigation.spec.ts \
 *     --project="<model-connector>"
 */

import { tags } from '@kbn/scout';
import type { RuleResponse } from '@kbn/alerting-plugin/common/routes/rule/response/types/v1';
import { evaluate } from '../../src/evaluate';
import { generateApmAttachmentEvalScenario } from '../../src/data_generators/apm';
import { apmTransactionRateAIAssistant } from '../../src/alert_templates/alerts';

const SERVICE_MAP_INVESTIGATION_PROMPT =
  'Investigate the service map I am currently viewing in APM. ' +
  'My current view filters: environment "production", time range last 15 minutes. ' +
  'Identify services with problems — active alerts, violated or degrading SLOs, ML anomalies, ' +
  'or unusual error rates and latency between services — ordered by severity. ' +
  'Explain the architecture and how the services connect, and give me links to the most ' +
  'problematic services and their alerts.';

evaluate.describe(
  'APM Agent Builder Service Map Investigation',
  { tag: tags.serverless.observability.complete },
  () => {
    const ruleIds: string[] = [];

    evaluate.beforeAll(async ({ apmSynthtraceEsClient, kbnClient, log }) => {
      await apmSynthtraceEsClient.clean();

      // eval-payment: latency spike + ~20% error rate in the last 15 min
      // eval-checkout: stable baseline (healthy comparison)
      await generateApmAttachmentEvalScenario({ apmSynthtraceEsClient });

      // APM rule: apm.transaction_error_rate for eval-payment in production.
      // Threshold of 10% — the spike scenario crosses ~20% so it should fire,
      // giving the map investigation an active alert to surface.
      try {
        const { data: apmRule } = await kbnClient.request<RuleResponse>({
          method: 'POST',
          path: '/api/alerting/rule',
          body: apmTransactionRateAIAssistant.ruleParams,
        });
        ruleIds.push(apmRule.id);
        log.debug(`Created APM rule ${apmRule.id}`);

        await kbnClient.request<void>({
          method: 'POST',
          path: `/internal/alerting/rule/${apmRule.id}/_run_soon`,
        });
      } catch (e) {
        log.error(`Failed to create or fire APM rule: ${e}`);
      }

      // Wait (bounded) for the rule to actually execute rather than a blind sleep.
      const POLL_ATTEMPTS = 20;
      const POLL_INTERVAL_MS = 1000;
      for (const ruleId of ruleIds) {
        for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt++) {
          try {
            const { data: rule } = await kbnClient.request<RuleResponse>({
              method: 'GET',
              path: `/api/alerting/rule/${ruleId}`,
            });
            if (rule.execution_status && rule.execution_status.status !== 'pending') {
              break;
            }
          } catch (e) {
            log.debug(`Polling status for rule ${ruleId} failed: ${e}`);
          }
          await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        }
      }
    });

    evaluate(
      'map investigation with an active alert — surfaces problems ordered by severity and renders the map',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'apm service map investigation: degraded map scope',
            description:
              'Verify the investigate-service-map skill surveys the whole map scope, flags the ' +
              'alerted/degraded service first, explains the architecture, renders a focused ' +
              'service-map attachment, and links to the problem services.',
            examples: [
              {
                input: {
                  question: SERVICE_MAP_INVESTIGATION_PROMPT,
                },
                output: {
                  criteria: [
                    // Skill routing is not directly observable — the judge checks the
                    // investigate-service-map output contract instead.
                    'The response leads with an issues/problems section that identifies eval-payment as the problematic service, mentioning its active alert and/or its elevated error rate or latency',
                    'Problems are presented ordered by severity, with the alerted service (eval-payment) listed before any lower-severity or structural observations',
                    'The response does NOT flag eval-checkout as a problem service — it is healthy',
                    'The response explains the service architecture: which service calls which, and the role of entry points and downstream dependencies in the seeded topology',
                    'The response renders an observability.service-map attachment showing the topology, focused on or including eval-payment',
                    'The response includes at least one markdown deep link to an APM page for eval-payment (service overview, alerts, or dependencies), built from a /app/apm/ URL — not a fabricated route',
                    'The response does NOT mention services that are absent from the seeded data (only eval-payment, eval-checkout, and their instrumented dependencies may appear)',
                    'The response does NOT substitute a prose topology description for the rendered service-map attachment',
                  ],
                },
                metadata: {},
              },
            ],
          },
        });
      }
    );

    evaluate(
      'map investigation with highlighted healthy service — respects user focus without inventing problems',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'apm service map investigation: highlighted healthy service',
            description:
              'Verify that when the user has highlighted a healthy service on the map, the skill ' +
              'anchors the topology on it, reports it as healthy, and still surfaces the genuinely ' +
              'problematic service elsewhere in scope.',
            examples: [
              {
                input: {
                  question:
                    'Investigate the service map I am currently viewing in APM. ' +
                    'My current view filters: environment "production", time range last 15 minutes, ' +
                    'highlighted service: eval-checkout. ' +
                    'Identify services with problems ordered by severity, explain the architecture, ' +
                    'and give me links to the most problematic services and their alerts.',
                },
                output: {
                  criteria: [
                    'The response addresses the highlighted service eval-checkout first and reports it as healthy or within normal range — it does NOT fabricate problems for it',
                    'The response still surfaces eval-payment as the problem service in the map scope (active alert and/or degraded metrics)',
                    'The response renders an observability.service-map attachment',
                    'The response includes at least one markdown deep link to an APM page for eval-payment',
                  ],
                },
                metadata: {},
              },
            ],
          },
        });
      }
    );

    evaluate.afterAll(async ({ apmSynthtraceEsClient, kbnClient, log }) => {
      await apmSynthtraceEsClient.clean();

      for (const id of ruleIds) {
        try {
          await kbnClient.request({ method: 'DELETE', path: `/api/alerting/rule/${id}` });
          log.debug(`Deleted rule ${id}`);
        } catch (e) {
          log.error(`Failed to delete rule ${id}: ${e}`);
        }
      }
    });
  }
);
