/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from 'langsmith';
import { LangChainTracer } from '@langchain/core/tracers/tracer_langchain';

export interface LangsmithTracingConfig {
  apiKey: string;
  apiUrl: string;
  project: string;
}

export const getLangsmithTracer = (config: LangsmithTracingConfig): LangChainTracer => {
  return new LangChainTracer({
    projectName: config.project,
    client: new Client({ apiKey: config.apiKey, apiUrl: config.apiUrl }),
  });
};
