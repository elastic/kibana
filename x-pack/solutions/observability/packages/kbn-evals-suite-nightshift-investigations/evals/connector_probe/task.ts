/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { ConversationRound } from '@kbn/agent-builder-common';
import type { EvalConnector } from '@kbn/evals';
import { MAX_TEXT_LENGTH } from '@kbn/significant-events-schema';
import { NIGHTSHIFT_ASSISTANT_AGENT_ID } from '@kbn/nightshift-investigations-plugin/common';
import { extractToolCallTrajectory } from '../investigation/tool_call_trajectory';
import type { ConnectorProbeExample, ConnectorProbeTaskOutput } from './types';

interface ConverseResponse {
  conversation_id: string;
  trace_id?: string;
  steps: ConversationRound['steps'];
  response: { message: string };
}

/** Asks the Nightshift assistant one probe question in a fresh conversation. */
export const runConnectorProbe = async (
  fetch: HttpHandler,
  example: ConnectorProbeExample,
  connector: Pick<EvalConnector, 'id'>
): Promise<ConnectorProbeTaskOutput> => {
  const {
    input: { question },
    metadata: { case_id: caseId },
  } = example;
  const started = Date.now();
  try {
    const {
      conversation_id: conversationId,
      trace_id: traceId,
      steps,
      response,
    } = await fetch<ConverseResponse>('/api/agent_builder/converse', {
      method: 'POST',
      version: '2023-10-31',
      body: JSON.stringify({
        agent_id: NIGHTSHIFT_ASSISTANT_AGENT_ID,
        connector_id: connector.id,
        input: question,
      }),
    });
    return {
      case_id: caseId,
      query: question,
      response: response.message,
      conversation_id: conversationId,
      traceId,
      duration_ms: Date.now() - started,
      tool_call_trajectory: extractToolCallTrajectory([{ steps }]).map((step) => ({
        ...step,
        result: step.result.slice(0, MAX_TEXT_LENGTH),
      })),
    };
  } catch (error) {
    return {
      case_id: caseId,
      query: question,
      duration_ms: Date.now() - started,
      tool_call_trajectory: [],
      execution_error: error instanceof Error ? error.message : String(error),
    };
  }
};
