/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setTimeout as delay } from 'timers/promises';
import type { Client } from '@elastic/elasticsearch';
import type { HttpHandler } from '@kbn/core/public';
import {
  DECISION_TREE_AI_INDEX_DEST,
  DECISION_TREE_TAG,
  NIGHTSHIFT_INVESTIGATION_AGENT_ID,
} from '@kbn/nightshift-investigations-plugin/common';
import {
  countsForTree,
  extractMermaid,
  parseMermaidDecisionTree,
} from '@kbn/nightshift-decision-trees';
import { NIGHTSHIFT_AGENT_OPTIMIZE_WORKFLOW_ID } from '@kbn/workflows/managed';
import {
  ExecutionStatus,
  TerminalExecutionStatuses,
  type WorkflowExecutionDto,
} from '@kbn/workflows';
import { parseSubmissions } from './arguments';
import type { ReinforcementExample, ReinforcementTaskOutput } from './types';

const API_VERSION = '2023-10-31';
const SPACE_ID = 'default';
/** Reinforce is bounded at 900s; cortex optimize can use its branch timeout first. */
const MAX_WAIT_MS = 20 * 60_000;
const POLL_INTERVAL_MS = 5_000;

const headers = { 'elastic-api-version': API_VERSION };

const headId = (treeId: string): string => {
  const symptom = treeId.replace(/^symptom:/, '');
  return `${SPACE_ID}:dtree_${symptom}`;
};

/** Writes the prior tree as the space's head so hydrate and prepare can see it. */
export const seedPriorTree = async (
  esClient: Client,
  example: ReinforcementExample
): Promise<void> => {
  const { tree_id: treeId, version, markdown } = example.input.prior_tree;
  const mermaid = extractMermaid(markdown);
  const tree = parseMermaidDecisionTree(mermaid, treeId);
  const symptom = treeId.replace(/^symptom:/, '');
  await esClient.index({
    index: DECISION_TREE_AI_INDEX_DEST,
    id: headId(treeId),
    refresh: 'wait_for',
    document: {
      '@timestamp': new Date().toISOString(),
      type: 'decision_tree',
      title: symptom,
      content: markdown,
      tags: ['nightshift', DECISION_TREE_TAG],
      learnings: [],
      attributes: {
        tree_id: treeId,
        symptom,
        version,
        status: version > 1 ? 'established' : 'tentative',
        node_count: tree.nodes.length,
        edge_count: tree.edges.length,
        space_id: SPACE_ID,
      },
      counts: countsForTree(tree),
    },
  });
};

const readSubmittedMarkdown = async (
  esClient: Client,
  treeId: string
): Promise<string | undefined> => {
  try {
    const response = await esClient.get<{ content?: string }>({
      index: DECISION_TREE_AI_INDEX_DEST,
      id: headId(treeId),
    });
    return response._source?.content;
  } catch {
    return undefined;
  }
};

const isTerminal = (status: ExecutionStatus): boolean => TerminalExecutionStatuses.includes(status);

/**
 * Replays one investigation round through the agent-optimize workflow, which runs the
 * reinforcement agent, and returns the submit arguments plus the tree it left behind.
 */
export const runReinforcementExample = async ({
  esClient,
  fetch,
  connectorId,
  example,
}: {
  esClient: Client;
  fetch: HttpHandler;
  connectorId: string;
  example: ReinforcementExample;
}): Promise<ReinforcementTaskOutput> => {
  const { tree_id: treeId, markdown: priorMarkdown } = example.input.prior_tree;
  const base: ReinforcementTaskOutput = {
    case_id: example.metadata.case_id,
    prior_mermaid: priorMarkdown,
    tree_id: treeId,
    submissions: [],
  };

  await seedPriorTree(esClient, example);
  const started = (await fetch(
    `/api/workflows/workflow/${encodeURIComponent(NIGHTSHIFT_AGENT_OPTIMIZE_WORKFLOW_ID)}/run`,
    {
      method: 'POST',
      version: API_VERSION,
      headers,
      body: JSON.stringify({
        inputs: {
          prompt: example.input.question,
          response: example.input.response,
          round_id: example.metadata.case_id,
          agent_id: NIGHTSHIFT_INVESTIGATION_AGENT_ID,
          connector_id: connectorId,
          tool_calls: example.input.tool_calls,
          tool_results: example.input.tool_results,
        },
      }),
    }
  )) as { workflowExecutionId: string };

  const executionId = started.workflowExecutionId;
  const deadline = Date.now() + MAX_WAIT_MS;
  let execution = await readExecution(fetch, executionId);
  while (!isTerminal(execution.status) && Date.now() < deadline) {
    await delay(POLL_INTERVAL_MS);
    execution = await readExecution(fetch, executionId);
  }

  const reinforce = execution.stepExecutions.find(
    (step) => step.stepId === 'reinforce_decision_trees'
  );
  const output = reinforce?.output as { submissions_json?: string; skipped?: boolean } | undefined;
  const submittedMarkdown = (await readSubmittedMarkdown(esClient, treeId)) ?? priorMarkdown;
  const finished = isTerminal(execution.status);
  const reinforced = reinforce?.status === ExecutionStatus.COMPLETED && output?.skipped !== true;
  const failed = !finished || execution.status !== ExecutionStatus.COMPLETED || !reinforced;

  return {
    ...base,
    execution_id: executionId,
    workflow_status: execution.status,
    execution_error: failed
      ? execution.error?.message ||
        (output?.skipped || reinforce?.status === ExecutionStatus.SKIPPED
          ? 'Decision-tree reinforcement was skipped. Select NIGHTSHIFT_DATASETS=reinforcement so Cortex and the sandbox are enabled.'
          : `Workflow ${execution.status}; reinforce step ${reinforce?.status ?? 'missing'}`)
      : undefined,
    submissions: parseSubmissions(output?.submissions_json),
    submitted_mermaid: submittedMarkdown,
  };
};

const readExecution = async (
  fetch: HttpHandler,
  executionId: string
): Promise<WorkflowExecutionDto> =>
  (await fetch(`/api/workflows/executions/${encodeURIComponent(executionId)}`, {
    method: 'GET',
    version: API_VERSION,
    headers,
    query: { includeOutput: true },
  })) as WorkflowExecutionDto;
