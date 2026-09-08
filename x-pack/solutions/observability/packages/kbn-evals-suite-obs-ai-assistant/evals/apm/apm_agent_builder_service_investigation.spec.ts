/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Eval coverage for the `investigate-apm-service` skill:
 *
 * The skill is triggered by service-health questions when no alert is attached.
 * It must always produce the mandatory three-attachment output contract:
 *   1. observability.apm-metrics  (current vs baseline)
 *   2. observability.apm-timeseries  (primary problem metric over time)
 *   3. observability.service-map
 *
 * This spec does NOT create alerting rules — it exercises free-text service investigation
 * using the synthetic `eval-payment` / `eval-checkout` fixture from
 * `generateApmAttachmentEvalScenario`.
 *
 * NOTE: This spec is NOT mirrored in the legacy eval framework. Do not copy it there.
 *
 * Run with:
 *   EVALUATION_CLIENT=agent_builder \
 *   AGENT_BUILDER_AGENT_ID=<agent-id> \
 *   EVALUATION_CONNECTOR_ID=<judge-connector-id> \
 *   node scripts/playwright test \
 *     --config x-pack/solutions/observability/packages/kbn-evals-suite-obs-ai-assistant/playwright.config.ts \
 *     evals/apm/apm_agent_builder_service_investigation.spec.ts \
 *     --project="<model-connector>"
 */

import { tags } from '@kbn/scout';
import { evaluate } from '../../src/evaluate';
import { generateApmAttachmentEvalScenario } from '../../src/data_generators/apm';

evaluate.describe(
  'APM Agent Builder Service Investigation',
  { tag: tags.serverless.observability.complete },
  () => {
    evaluate.beforeAll(async ({ apmSynthtraceEsClient }) => {
      await apmSynthtraceEsClient.clean();
      // eval-payment: latency spike + ~20% error rate in the last 15 min
      // eval-checkout: stable baseline (healthy comparison)
      await generateApmAttachmentEvalScenario({ apmSynthtraceEsClient });
    });

    evaluate(
      'degraded service investigation — uses investigate-apm-service skill and renders all three attachments',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'apm service investigation: degraded service free-text',
            description:
              'Verify the investigate-apm-service skill handles a free-text "what is wrong" question, ' +
              'renders the three mandatory attachments, identifies the latency/error degradation, ' +
              'and provides confidence-labelled hypotheses.',
            examples: [
              {
                input: {
                  question: "What's wrong with the eval-payment service?",
                },
                output: {
                  criteria: [
                    // Skill routing via observable output contract
                    // (we can't observe skill selection directly — the judge checks the output contract)
                    'The response renders an APM metrics comparison card (observability.apm-metrics attachment) showing current latency and error rate for eval-payment noticeably higher than the baseline',
                    'The response renders a timeseries chart (observability.apm-timeseries attachment) for the primary degraded metric (latency or failed transaction rate) for eval-payment, showing a spike in the last 15 minutes',
                    'The response renders a service map (observability.service-map attachment) showing the topology around eval-payment',
                    'The response includes a Summary section with 2–4 sentences describing which service is affected and what metric degraded',
                    'The response includes at least one Probable cause labelled with a confidence level (Critical, High, Medium, or Speculative)',
                    'The response includes an Evidence section with at least one bullet citing specific metric values or tool output',
                    'The response includes a Recommended next steps section with actionable bullets',
                    'The response includes deep links to the APM service overview or transactions page for eval-payment',
                    // The response must NOT describe trend/topology in pure prose without attachments
                    'The response does NOT substitute prose descriptions for the metric trend or topology — both appear as rendered attachments',
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
      'healthy service investigation — reports healthy state without false-positive root causes',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'apm service investigation: healthy service',
            description:
              'Verify that the skill correctly identifies a healthy service (eval-checkout is stable) ' +
              'and does not fabricate root causes. All three attachments should still be rendered.',
            examples: [
              {
                input: {
                  question: 'Is the eval-checkout service healthy?',
                },
                output: {
                  criteria: [
                    'The response renders an APM metrics comparison card (observability.apm-metrics attachment) for eval-checkout',
                    'The response renders a timeseries chart (observability.apm-timeseries attachment) for eval-checkout',
                    'The response renders a service map (observability.service-map attachment)',
                    'The response indicates eval-checkout is healthy or within normal operating range — it does NOT claim there is a problem when there is none',
                    'The response does NOT fabricate root causes or speculative hypotheses for a healthy service',
                  ],
                },
                metadata: {},
              },
            ],
          },
        });
      }
    );

    evaluate.afterAll(async ({ apmSynthtraceEsClient }) => {
      await apmSynthtraceEsClient.clean();
    });
  }
);
