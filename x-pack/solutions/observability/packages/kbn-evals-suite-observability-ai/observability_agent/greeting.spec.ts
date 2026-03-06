/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { evaluate } from './evaluate';

evaluate.describe(
  'Observability Agent Greeting',
  { tag: tags.serverless.observability.complete },
  () => {
    evaluate('responds to a greeting without calling tools', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'observability agent: greeting',
          description: 'Verifies a simple greeting is handled without unnecessary tool calls',
          examples: [
            {
              input: {
                question: 'hi',
              },
              output: {
                criteria: ['Response is brief and friendly.', 'Does not call tools.'],
                expected:
                  'Hi! I am your Observability Agent. How can I help you investigate today?',
              },
              metadata: {},
            },
          ],
        },
      });
    });
  }
);
