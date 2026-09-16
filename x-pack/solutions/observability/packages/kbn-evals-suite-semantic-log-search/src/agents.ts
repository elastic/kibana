/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import { GET_LOGS_SEMANTIC_TOOL_ID, GET_LOGS_TOOL_ID } from './constants';
import type { Arm } from './types';

const AGENTS_API_PATH = '/api/agent_builder/agents';

/** Agent ids are capped at 64 characters, so the connector id is hashed in. */
const agentIdFor = (arm: Arm, connectorId: string): string => {
  const connectorHash = createHash('sha256').update(connectorId).digest('hex').slice(0, 8);
  return `eval_semlogs_${arm}_${connectorHash}_${Date.now().toString(36)}`;
};

interface CreateAgentParams {
  fetch: HttpHandler;
  log: ToolingLog;
  connectorId: string;
  arm: Arm;
}

/**
 * Creates the agent for one arm.
 *
 * The keyword arm gets only `get_logs`. The semantic arm gets both tools; it is
 * deliberately *not* told to use `get_logs_semantic`, because whether the model
 * recognises that a paraphrased question needs the semantic path is the thing
 * being measured.
 */
export const createArmAgent = async ({
  fetch,
  log,
  connectorId,
  arm,
}: CreateAgentParams): Promise<string> => {
  const id = agentIdFor(arm, connectorId);

  const toolIds =
    arm === 'keyword' ? [GET_LOGS_TOOL_ID] : [GET_LOGS_TOOL_ID, GET_LOGS_SEMANTIC_TOOL_ID];

  const instructions = [
    'You are answering a question about application logs.',
    'Use a logs tool to find evidence before answering.',
    'Quote the log messages you found verbatim in your answer.',
  ];

  await fetch(AGENTS_API_PATH, {
    method: 'POST',
    version: '2023-10-31',
    body: JSON.stringify({
      id,
      name: `Eval: semantic log search (${arm})`,
      description: `Evaluation agent for the "${arm}" arm of semantic log search.`,
      configuration: {
        instructions: instructions.join('\n'),
        tools: [{ tool_ids: toolIds }],
      },
    }),
  });

  log.debug(`Created eval agent "${id}" for the ${arm} arm`);

  return id;
};

export const deleteAgent = async ({
  fetch,
  log,
  agentId,
}: {
  fetch: HttpHandler;
  log: ToolingLog;
  agentId: string;
}): Promise<void> => {
  try {
    await fetch(`${AGENTS_API_PATH}/${encodeURIComponent(agentId)}`, {
      method: 'DELETE',
      version: '2023-10-31',
    });
    log.debug(`Deleted eval agent "${agentId}"`);
  } catch (error) {
    // Leaving an agent behind pollutes later runs but must not fail the run that
    // produced the scores.
    log.warning(
      `Failed to delete eval agent "${agentId}": ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};
