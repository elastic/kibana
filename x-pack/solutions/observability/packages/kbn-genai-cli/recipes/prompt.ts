/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolOptions, createPrompt } from '@kbn/inference-common';
import { runRecipe } from '@kbn/inference-cli';

/**
 * Simple example of how to use these recipes
 */

runRecipe(async ({ inferenceClient, kibanaClient, log, signal }) => {
  const prompt = createPrompt({
    name: 'my-test-prompt',
    input: z.object({
      foo: z.literal('world'),
    }),
    description: 'My test prompt',
  })
    .version({
      system: `You're a nice chatbot`,
      template: {
        mustache: {
          template: `Hello {{foo}}`,
        },
      },
      tools: {
        foo: {
          description: 'My tool',
          schema: {
            type: 'object',
            properties: {
              bar: {
                type: 'string',
              },
            },
            required: ['bar'],
          },
        },
      } as const satisfies ToolOptions['tools'],
    })
    .get();

  const result = await inferenceClient.prompt({
    prompt,
    input: {
      foo: 'world',
    },
  });

  log.info(result);
});
