/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { HttpHandler } from '@kbn/core/public';

import { ObservabilityAIAssistantEvaluationChatClient } from './obs_ai_assistant_client';
import { AgentBuilderClient } from './agent_builder_client';
import type { ChatClient } from './types';

type ClientType = 'obs_ai_assistant' | 'agent_builder';

function isValidClientType(value: string): value is ClientType {
  return value === 'obs_ai_assistant' || value === 'agent_builder';
}

export function createChatClient(
  fetch: HttpHandler,
  log: ToolingLog,
  connectorId: string
): ChatClient {
  const clientTypeValue = process.env.EVALUATION_CLIENT || 'obs_ai_assistant';

  if (!isValidClientType(clientTypeValue)) {
    throw new Error(
      `Invalid EVALUATION_CLIENT value: "${clientTypeValue}". Must be "obs_ai_assistant" or "agent_builder".`
    );
  }

  log.info(`Creating chat client with type: ${clientTypeValue}`);

  if (clientTypeValue === 'obs_ai_assistant') {
    return new ObservabilityAIAssistantEvaluationChatClient(fetch, log, connectorId);
  } else {
    const agentId = process.env.AGENT_BUILDER_AGENT_ID;
    return new AgentBuilderClient(fetch, log, connectorId, agentId);
  }
}
