/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Eval coverage for the `observability.apm-related-alerts` attachment:
 *
 * When an APM alert is active for the investigated service, both `investigate-apm-alert`
 * and `investigate-apm-service` should create and render an `observability.apm-related-alerts`
 * attachment listing it. When no alerts are active the attachment should be absent and the
 * response should explicitly state that no active alerts were found.
 *
 * NOTE: This spec is NOT mirrored in the legacy eval framework. Do not copy it there.
 *
 * Run with:
 *   EVALUATION_CLIENT=agent_builder \
 *   AGENT_BUILDER_AGENT_ID=<agent-id> \
 *   EVALUATION_CONNECTOR_ID=<judge-connector-id> \
 *   node scripts/playwright test \
 *     --config x-pack/solutions/observability/packages/kbn-evals-suite-obs-ai-assistant/playwright.config.ts \
 *     evals/apm/apm_agent_builder_related_alerts.spec.ts \
 *     --project="<model-connector>"
 */

import { tags } from '@kbn/scout';
import type { RuleResponse } from '@kbn/alerting-plugin/common/routes/rule/response/types/v1';
import { evaluate } from '../../src/evaluate';
import { generateApmAttachmentEvalScenario } from '../../src/data_generators/apm';
import { apmTransactionRateAIAssistant } from '../../src/alert_templates/alerts';

evaluate.describe(
  'APM Agent Builder Related Alerts Attachment',
  { tag: tags.serverless.observability.complete },
  () => {
    const ruleIds: string[] = [];

    evaluate.beforeAll(async ({ apmSynthtraceEsClient, kbnClient, log }) => {
      await apmSynthtraceEsClient.clean();
      await generateApmAttachmentEvalScenario({ apmSynthtraceEsClient });

      // Create an APM rule for eval-payment (threshold 10%, scenario crosses ~20%)
      try {
        const { data: apmRule } = await kbnClient.request<RuleResponse>({
          method: 'POST',
          path: '/api/alerting/rule',
          body: apmTransactionRateAIAssistant.ruleParams,
        });
        ruleIds.push(apmRule.id);
        log.debug(`Created APM rule ${apmRule.id}`);

        // Trigger immediate execution
        await kbnClient.request({
          method: 'POST',
          path: `/internal/alerting/rule/${apmRule.id}/_run_soon`,
        });

        // Bounded poll: wait until execution leaves 'pending' (max 20s)
        let attempts = 0;
        while (attempts < 20) {
          const { data: ruleStatus } = await kbnClient.request<{
            execution_status: { status: string };
          }>({
            method: 'GET',
            path: `/api/alerting/rule/${apmRule.id}`,
          });
          if (ruleStatus.execution_status.status !== 'pending') break;
          await new Promise((resolve) => setTimeout(resolve, 1000));
          attempts++;
        }
      } catch (err) {
        log.warning(`Could not create/fire APM rule: ${err}`);
      }
    });

    evaluate(
      'related alerts rendered when an active APM alert exists for the service',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'apm related alerts: active alert present',
            description:
              'When investigating eval-payment and there is an active APM alert, ' +
              'the response should include an observability.apm-related-alerts attachment ' +
              'listing the active alert with its rule name and reason.',
            examples: [
              {
                input: {
                  question:
                    "What's wrong with the eval-payment service? Are there any active alerts?",
                },
                output: {
                  criteria: [
                    'The response renders an observability.apm-related-alerts attachment listing at least one active alert for eval-payment',
                    'The related-alerts attachment includes the rule name and status of the active alert',
                    'The response includes a reason or brief description of what the alert fired on',
                    // Must still render all three mandatory attachments as well
                    'The response renders an observability.apm-metrics attachment for eval-payment',
                    'The response renders an observability.apm-timeseries attachment for eval-payment',
                    'The response renders an observability.service-map attachment',
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
      'no related-alerts attachment when investigating a service with no active alerts',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'apm related alerts: no active alerts',
            description:
              'When investigating eval-checkout (healthy, no rule created for it), ' +
              'the response should NOT render an observability.apm-related-alerts attachment ' +
              'and should explicitly state no active alerts were found.',
            examples: [
              {
                input: {
                  question: 'Are there any active alerts for the eval-checkout service?',
                },
                output: {
                  criteria: [
                    'The response does NOT render an observability.apm-related-alerts attachment for eval-checkout with active alerts in it',
                    'The response explicitly states that no active alerts were found for eval-checkout (or equivalent phrasing)',
                  ],
                },
                metadata: {},
              },
            ],
          },
        });
      }
    );

    evaluate.afterAll(async ({ apmSynthtraceEsClient, kbnClient }) => {
      await apmSynthtraceEsClient.clean();
      for (const ruleId of ruleIds) {
        try {
          await kbnClient.request({
            method: 'DELETE',
            path: `/api/alerting/rule/${ruleId}`,
          });
        } catch {
          // best-effort cleanup
        }
      }
      ruleIds.length = 0;
    });
  }
);
