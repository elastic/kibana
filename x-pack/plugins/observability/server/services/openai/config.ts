/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';

export const openAIConfig = schema.object({
  openAI: schema.object({
    model: schema.string(),
    apiKey: schema.string(),
  }),
});

export const azureOpenAIConfig = schema.object({
  azureOpenAI: schema.object({
    resourceName: schema.string(),
    deploymentId: schema.string(),
    apiKey: schema.string(),
  }),
});

export const observabilityCoPilotConfig = schema.object({
  enabled: schema.boolean({ defaultValue: false }),
  feedback: schema.object({
    enabled: schema.boolean({ defaultValue: false }),
    url: schema.maybe(schema.string()),
  }),
  provider: schema.oneOf([openAIConfig, azureOpenAIConfig]),
});

export type OpenAIConfig = TypeOf<typeof openAIConfig>['openAI'];
export type AzureOpenAIConfig = TypeOf<typeof azureOpenAIConfig>['azureOpenAI'];
export type ObservabilityCoPilotConfig = TypeOf<typeof observabilityCoPilotConfig>;
