/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { evaluate } from './evaluate';

const screenContextAttachment = {
  id: 'screen-context',
  type: 'screen_context',
  data: {
    app: 'observability-overview',
    url: 'http://localhost:5601/app/observability/overview',
    time_range: { from: 'now-2h', to: 'now' },
  },
  hidden: true,
};

evaluate.describe('Tool Time Arguments', { tag: tags.serverless.observability.complete }, () => {
  evaluate('uses screen context time range in tool calls', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'tool-arguments: uses screen context time range',
        description:
          'Verifies tool calls include start and end from screen context for simple service discovery',
        examples: [
          {
            input: {
              question: 'What services are running?',
              attachments: [screenContextAttachment],
            },
            output: {
              criteria: [
                'Tool calls include start="now-2h" matching the screen context time range',
                'Tool calls include end="now" matching the screen context time range',
              ],
            },
            metadata: {},
          },
        ],
      },
    });
  });

  evaluate('user-specified time range overrides screen context', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'tool-arguments: user time override',
        description:
          'Verifies an explicit user time range takes precedence over screen context time range',
        examples: [
          {
            input: {
              question: 'Show me running services from the last 30 minutes',
              attachments: [screenContextAttachment],
            },
            output: {
              criteria: [
                'Tool calls use a 30-minute window (for example start="now-30m")',
                'Tool calls do not use the screen context start="now-2h" when user time is explicit',
              ],
            },
            metadata: {},
          },
        ],
      },
    });
  });

  evaluate(
    'uses tool default time range without context or user time',
    async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'tool-arguments: default time fallback',
          description:
            'Verifies the agent falls back to tool default time range when no screen context or explicit user time is provided',
          examples: [
            {
              input: {
                question: 'What services are running?',
              },
              output: {
                criteria: [
                  'Uses the default time range for the tool when no time context is provided (commonly start="now-1h" and end="now")',
                ],
              },
              metadata: {},
            },
          ],
        },
      });
    }
  );
});
