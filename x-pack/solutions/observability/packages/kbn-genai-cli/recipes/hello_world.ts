/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { runRecipe } from '@kbn/inference-cli';

/**
 * Simple example of how to use these recipes
 */

runRecipe(async ({ inferenceClient, kibanaClient, log, signal }) => {
  const response = await inferenceClient.output({
    id: 'extract_personal_details',
    input: `Sarah is a 29-year-old software developer living in San Francisco.`,
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
        city: { type: 'string' },
      },
      required: ['name'],
    } as const,
  });

  log.info(response);
});
