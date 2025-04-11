/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LangChainTracer } from '@langchain/core/tracers/tracer_langchain';
import type { WorkChatTracingConfig } from '../../../config';
import { getLangsmithTracer } from './langsmith';

export const getTracers = ({ config }: { config: WorkChatTracingConfig }) => {
  const tracers: LangChainTracer[] = [];
  if (config?.langsmith?.enabled) {
    tracers.push(
      getLangsmithTracer({
        apiKey: config.langsmith.apiKey,
        apiUrl: config.langsmith.apiUrl,
        project: config.langsmith.project,
      })
    );
  }
  return tracers;
};
