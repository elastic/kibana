/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AzureOpenAIClient } from './azure_openai_client';
import { ObservabilityCoPilotConfig } from './config';
import { OpenAIClient } from './openai_client';
import { IOpenAIClient } from './types';

export class OpenAIService {
  public readonly client: IOpenAIClient;

  constructor(config: ObservabilityCoPilotConfig) {
    if ('openAI' in config.provider) {
      this.client = new OpenAIClient(config.provider.openAI);
    } else {
      this.client = new AzureOpenAIClient(config.provider.azureOpenAI);
    }
  }
}
