/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import type { RuleResponse } from '@kbn/alerting-plugin/common/routes/rule/response/types/v1';
import { evaluate } from '../../src/evaluate';
import { generateAIAssistantApmScenario } from '../../src/data_generators/apm';
import { apmErrorCountAIAssistant } from '../../src/alert_templates/apm';

/**
 * NOTE: This scenario has been migrated from the legacy evaluation framework.
 * - x-pack/solutions/observability/plugins/observability_ai_assistant_app/scripts/evaluation/scenarios/apm/index.spec.ts
 * Any changes should be made in both places until the legacy evaluation framework is removed.
 */

evaluate.describe('APM functionality', { tag: tags.serverless.observability.complete }, () => {
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

  evaluate('service throughput', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'apm: service throughput',
        description:
          'Validates that the assistant computes throughput by generating ES|QL and executing it.',
        examples: [
          {
            input: {
              question:
                'What is the average throughput per minute for the ai-assistant-service service over the past 4 hours?',
            },
            output: {
              criteria: [
                'Uses the get_apm_dataset_info function to get information about the APM data streams',
                'Uses the query function to generate an ES|QL query',
                'The generated ES|QL query should be valid and return throughput data for the past 4 hours',
                'Uses the execute_query function to get the results for the generated query',
                'The response should contain a summary of the throughput results',
                'The response should contain a calculated throughput of 30 transactions per minute',
              ],
            },
            metadata: {},
          },
        ],
      },
    });
  });

  evaluate('service dependencies', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'apm: service dependencies',
        description: 'Validates use of get_apm_downstream_dependencies.',
        examples: [
          {
            input: {
              question:
                'What are the downstream dependencies of the ai-assistant-service-front service?',
            },
            output: {
              criteria: [
                'Uses the get_apm_downstream_dependencies function with the `service.name` parameter being "ai-assistant-service-front"',
                'The response should contain the downstream dependencies list',
                'The response should identify "ai-assistant-service-back" as the only dependency',
              ],
            },
            metadata: {},
          },
        ],
      },
    });
  });

  evaluate('services in environment', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'apm: services in environment',
        description: 'Lists active services in the environment test.',
        examples: [
          {
            input: {
              question: 'What are the active services in the environment "test"?',
            },
            output: {
              criteria: [
                'The response should contain the active services in the environment "test"',
                'Successfully executes a query that filters on service.environment and returns service.name',
                'The response should mention the two active services and their service names',
              ],
            },
            metadata: {},
          },
        ],
      },
    });
  });

  evaluate('error rate per service', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'apm: error rate per service',
        description: 'Returns average error rate per service over the last 4 hours.',
        examples: [
          {
            input: {
              question: 'What is the average error rate per service over the past 4 hours?',
            },
            output: {
              criteria: [
                'Successfully executes a query that returns the error rate for the services in the last four hours',
                'The response should contain error rate information per service',
              ],
            },
            metadata: {},
          },
        ],
      },
    });
  });

  evaluate('top 2 frequent errors', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'apm: top 2 frequent errors',
        description:
          'Returns the top 2 most frequent errors for services in test environment in last hour.',
        examples: [
          {
            input: {
              question:
                'What are the top 2 most frequent errors in the services in the test environment in the last hour?',
            },
            output: {
              criteria: [
                'The response should contain the top 2 most frequent errors',
                'The errors should be from services in the test environment within the last hour',
              ],
            },
            metadata: {},
          },
        ],
      },
    });
  });

  evaluate('current alerts for services', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'apm: current alerts for services',
        description: 'Returns current alerts for services in the test environment.',
        examples: [
          {
            input: { question: 'Are there any alert for those services?' },
            output: {
              criteria: [
                'The response should contain current alerts for services in the test environment',
                'The response should indicate whether alerts exist or none are found',
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
