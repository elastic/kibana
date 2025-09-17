/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleResponse } from '@kbn/alerting-plugin/common/routes/rule/response/types/v1';
import { evaluate as base } from '../../src/evaluate';
import type { EvaluateApmDataset } from './evaluate_apm_dataset';
import { createEvaluateApmDataset } from './evaluate_apm_dataset';
import { generateAIAssistantApmScenario } from '../../src/data_generators/apm';
import { apmErrorCountAIAssistant } from '../../src/alert_templates/apm';

/**
 * NOTE: This scenario has been migrated from the legacy evaluation framework.
 * - x-pack/solutions/observability/plugins/observability_ai_assistant_app/scripts/evaluation/scenarios/apm/index.spec.ts
 * Any changes should be made in both places until the legacy evaluation framework is removed.
 */

const evaluate = base.extend<{
  evaluateApmDataset: EvaluateApmDataset;
}>({
  evaluateApmDataset: [
    ({ chatClient, evaluators, phoenixClient }, use) => {
      use(
        createEvaluateApmDataset({
          chatClient,
          evaluators,
          phoenixClient,
        })
      );
    },
    { scope: 'test' },
  ],
});

evaluate.describe('APM functionality', { tag: '@svlOblt' }, () => {
  const ruleIds: string[] = [];

  evaluate.beforeAll(async ({ apmSynthtraceEsClient, kbnClient, log }) => {
    await apmSynthtraceEsClient.clean();
    await generateAIAssistantApmScenario({ apmSynthtraceEsClient });

    const ruleBody = apmErrorCountAIAssistant.ruleParams;

    try {
      const { data: rule } = await kbnClient.request<RuleResponse>({
        method: 'POST',
        path: '/api/alerting/rule',
        body: ruleBody,
      });
      ruleIds.push(rule.id);
      log.debug(`Created APM rule ${rule.id}`);
    } catch (e) {
      log.error(`Failed to create APM rule: ${e}`);
    }
  });

  evaluate('service throughput', async ({ evaluateApmDataset }) => {
    await evaluateApmDataset({
      dataset: {
        name: 'apm: service throughput',
        description:
          'Validates that the assistant computes throughput by generating ES|QL and executing it.',
        examples: [
          {
            input: {
              prompt:
                'What is the average throughput per minute for the ai-assistant-service service over the past 4 hours?',
            },
            output: {
              criteria: [
                'Uses the get_apm_dataset_info function to get information about the APM data streams',
                'Uses the query function to generate an ES|QL query',
                'Generates a valid ES|QL query that returns the throughput over the past 4 hours.',
                'Uses the execute_query function to get the results for the generated query',
                'Summarizes the results for the user',
                'Calculates a throughput of 30 transactions per minute',
              ],
            },
            metadata: {},
          },
        ],
      },
    });
  });

  evaluate('service dependencies', async ({ evaluateApmDataset }) => {
    await evaluateApmDataset({
      dataset: {
        name: 'apm: service dependencies',
        description: 'Validates use of get_apm_downstream_dependencies.',
        examples: [
          {
            input: {
              prompt:
                'What are the downstream dependencies of the ai-assistant-service-front service?',
            },
            output: {
              criteria: [
                'Uses the get_apm_downstream_dependencies function with the `service.name` parameter being "ai-assistant-service-front"',
                'Returns the results to the user ("ai-assistant-service-back" is the only dependency)',
              ],
            },
            metadata: {},
          },
        ],
      },
    });
  });

  evaluate('services in environment', async ({ evaluateApmDataset }) => {
    await evaluateApmDataset({
      dataset: {
        name: 'apm: services in environment',
        description: 'Lists active services in the environment test.',
        examples: [
          {
            input: {
              prompt: 'What are the active services in the environment "test"?',
            },
            output: {
              criteria: [
                'Responds with the active services in the environment "test"',
                'Successfully executes a query that filters on service.environment and return service.name',
                'Mentions the two active services and their service names',
              ],
            },
            metadata: {},
          },
        ],
      },
    });
  });

  evaluate('error rate per service', async ({ evaluateApmDataset }) => {
    await evaluateApmDataset({
      dataset: {
        name: 'apm: error rate per service',
        description: 'Returns average error rate per service over the last 4 hours.',
        examples: [
          {
            input: {
              prompt: 'What is the average error rate per service over the past 4 hours?',
            },
            output: {
              criteria: [
                'Succesfully executes a query that returns the error rate for the services in the last four hours',
              ],
            },
            metadata: {},
          },
        ],
      },
    });
  });

  evaluate('top 2 frequent errors', async ({ evaluateApmDataset }) => {
    await evaluateApmDataset({
      dataset: {
        name: 'apm: top 2 frequent errors',
        description:
          'Returns the top 2 most frequent errors for services in test environment in last hour.',
        examples: [
          {
            input: {
              prompt:
                'What are the top 2 most frequent errors in the services in the test environment in the last hour?',
            },
            output: {
              criteria: [
                'Mentions the top 2 frequent errors of the services in the last hour, for the specified services in test environment',
              ],
            },
            metadata: {},
          },
        ],
      },
    });
  });

  evaluate('current alerts for services', async ({ evaluateApmDataset }) => {
    await evaluateApmDataset({
      dataset: {
        name: 'apm: current alerts for services',
        description: 'Returns current alerts for services in the test environment.',
        examples: [
          {
            input: { prompt: 'Are there any alert for those services?' },
            output: {
              criteria: [
                'Returns the current alerts for the services, for the specified services in test environment',
              ],
            },
            metadata: {},
          },
        ],
      },
    });
  });

  evaluate.afterAll(async ({ apmSynthtraceEsClient, kbnClient, log }) => {
    await apmSynthtraceEsClient.clean();

    for (const id of ruleIds) {
      try {
        await kbnClient.request({ method: 'DELETE', path: `/api/alerting/rule/${id}` });
        log.debug(`Deleted APM rule ${id}`);
      } catch (e) {
        log.error(`Failed to delete APM rule ${id}: ${e}`);
      }
    }
  });
});
