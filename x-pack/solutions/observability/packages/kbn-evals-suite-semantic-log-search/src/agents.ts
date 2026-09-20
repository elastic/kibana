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

/**
 * `baseline` uses the default agent, so it is never created here. Excluding it
 * from the type prevents silently giving the baseline arm the semantic tool via
 * an `else` branch.
 */
type NonBaselineArm = Exclude<Arm, 'baseline'>;

const TOOL_IDS_BY_ARM: Record<NonBaselineArm, string[]> = {
  keyword: [GET_LOGS_TOOL_ID],
  semantic: [GET_LOGS_SEMANTIC_TOOL_ID],
};

interface CreateAgentParams {
  fetch: HttpHandler;
  log: ToolingLog;
  connectorId: string;
  arm: NonBaselineArm;
}

/**
 * Creates the agent for one arm.
 *
 * Each arm receives exactly one tool: the keyword arm gets `get_logs`, the
 * semantic arm gets `get_logs_semantic`. This isolates the comparison to the
 * retrieval quality of each tool, without mixing in the model's tool selection.
 */
export const createArmAgent = async ({
  fetch,
  log,
  connectorId,
  arm,
}: CreateAgentParams): Promise<string> => {
  const id = agentIdFor(arm, connectorId);

  const toolIds = TOOL_IDS_BY_ARM[arm];

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
