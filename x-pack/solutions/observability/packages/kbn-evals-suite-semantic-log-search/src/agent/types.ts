/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Output of an agent arm: the prose answer plus the steps that produced it. */
export interface AgentTaskOutput {
  answer: string;
  steps: Array<{ tool_id?: string; params?: Record<string, unknown>; [key: string]: unknown }>;
  traceId?: string;
}
