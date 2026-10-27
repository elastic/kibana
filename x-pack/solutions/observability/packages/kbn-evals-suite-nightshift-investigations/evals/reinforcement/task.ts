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
import type { EvalConnector } from '@kbn/evals';
import {
  ExecutionStatus,
  TerminalExecutionStatuses,
  type WorkflowExecutionDto,
  type WorkflowExecutionListDto,
} from '@kbn/workflows';
import { NIGHTSHIFT_AGENT_OPTIMIZE_WORKFLOW_ID } from '@kbn/workflows/managed';
import { runInvestigation } from '../investigation/task';
import type { InvestigationExample } from '../investigation/types';
import { parseSubmissions, treeIdsInSubmission } from './arguments';
import type { ReinforcementExample, ReinforcementTaskOutput } from './types';

const API_VERSION = '2023-10-31';
const SPACE_ID = 'default';
/**
 * The investigation stays in progress while its post-execution hook waits for reinforcement
 * (bounded at 900s), on top of the investigation itself.
 */
export const CUSTOMER0_REINFORCEMENT_TIMEOUT_MS = 45 * 60_000;
/** Reinforce is bounded at 900s; cortex optimize can use its branch timeout first. */
const MAX_WAIT_MS = 20 * 60_000;
/** How long to wait for the post-execution execution to be searchable after the investigation. */
const EXECUTION_LOOKUP_MS = 30_000;
/** Kibana and Elasticsearch clocks can disagree by a few seconds. */
const TREE_WRITE_SKEW_MS = 30_000;
const POLL_INTERVAL_MS = 5_000;

const headers = { 'elastic-api-version': API_VERSION };

const headId = (treeId: string): string => {
  const symptom = treeId.replace(/^symptom:/, '');
  return `${SPACE_ID}:dtree_${symptom}`;
};

const versionId = (treeId: string, version: number): string => `${headId(treeId)}_v${version}`;

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

/** The same step id is recorded twice; only the later one carries the agent output. */
const reinforceStep = (execution: WorkflowExecutionDto) =>
  [...(execution.stepExecutions ?? [])].reverse().find((step) => {
    if (step.stepId !== 'reinforce_decision_trees' || step.output == null) return false;
    return typeof step.output === 'object';
  });

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

  const reinforce = reinforceStep(execution);
  const output = reinforce?.output as
    | {
        submissions_json?: string;
        skipped?: boolean;
        trace_id?: string;
      }
    | undefined;
  const submittedMarkdown = (await readSubmittedMarkdown(esClient, treeId)) ?? priorMarkdown;
  const finished = isTerminal(execution.status);
  const reinforced = reinforce?.status === ExecutionStatus.COMPLETED && output?.skipped !== true;
  const failed = !finished || execution.status !== ExecutionStatus.COMPLETED || !reinforced;

  return {
    ...base,
    execution_id: executionId,
    ...(output?.trace_id ? { traceId: output.trace_id } : {}),
    workflow_status: execution.status,
    execution_error: failed
      ? execution.error?.message ||
        (output?.skipped || reinforce?.status === ExecutionStatus.SKIPPED
          ? 'Decision-tree reinforcement was skipped. Select NIGHTSHIFT_DATASETS=reinforcement so decision trees and the sandbox are enabled.'
          : `Workflow ${execution.status}; reinforce step ${reinforce?.status ?? 'missing'}`)
      : undefined,
    submissions: parseSubmissions(output?.submissions_json),
    submitted_mermaid: submittedMarkdown,
  };
};

const readExecution = async (
  fetch: HttpHandler,
  executionId: string,
  query: { includeInput?: boolean; includeOutput?: boolean } = { includeOutput: true }
): Promise<WorkflowExecutionDto> =>
  (await fetch(`/api/workflows/executions/${encodeURIComponent(executionId)}`, {
    method: 'GET',
    version: API_VERSION,
    headers,
    query,
  })) as WorkflowExecutionDto;

interface StoredTree {
  content?: string;
  '@timestamp'?: string;
  attributes?: { version?: number | string };
}

const readTreeDoc = async (esClient: Client, id: string): Promise<StoredTree | undefined> => {
  try {
    const response = await esClient.get<StoredTree>({
      index: DECISION_TREE_AI_INDEX_DEST,
      id,
    });
    return response._source ?? undefined;
  } catch {
    return undefined;
  }
};

const writtenThisRun = (timestamp: string | undefined, startedAtMs: number): boolean => {
  const writtenAt = timestamp ? Date.parse(timestamp) : Number.NaN;
  return Number.isFinite(writtenAt) && writtenAt >= startedAtMs - TREE_WRITE_SKEW_MS;
};

/** Prior is the previous version when this run committed, otherwise the head that was already there. */
const treesAfterRun = async (
  esClient: Client,
  treeIds: string[],
  startedAtMs: number
): Promise<NonNullable<ReinforcementTaskOutput['trees']>> => {
  const trees: NonNullable<ReinforcementTaskOutput['trees']> = [];
  for (const treeId of treeIds) {
    const head = await readTreeDoc(esClient, headId(treeId));
    const version = Number(head?.attributes?.version);
    const wrote = writtenThisRun(head?.['@timestamp'], startedAtMs);
    const previous =
      wrote && version > 1
        ? await readTreeDoc(esClient, versionId(treeId, version - 1))
        : undefined;
    trees.push({
      tree_id: treeId,
      prior_mermaid: wrote ? previous?.content : head?.content,
      submitted_mermaid: head?.content,
    });
  }
  return trees;
};

const conversationIdOf = (execution: WorkflowExecutionDto): string | undefined => {
  const inputs = execution.context?.inputs;
  if (inputs && typeof inputs === 'object' && 'conversation_id' in inputs) {
    const conversationId = inputs.conversation_id;
    if (typeof conversationId === 'string' && conversationId.length > 0) return conversationId;
  }
  for (const step of execution.stepExecutions ?? []) {
    const stepInput = step.input;
    if (stepInput && typeof stepInput === 'object' && 'conversation_id' in stepInput) {
      const conversationId = stepInput.conversation_id;
      if (typeof conversationId === 'string' && conversationId.length > 0) return conversationId;
    }
  }
  return undefined;
};

const listOptimizeExecutionIds = async (
  fetch: HttpHandler,
  startedAfter?: string
): Promise<string[]> => {
  const listed = (await fetch(
    `/api/workflows/workflow/${encodeURIComponent(
      NIGHTSHIFT_AGENT_OPTIMIZE_WORKFLOW_ID
    )}/executions`,
    {
      method: 'GET',
      version: API_VERSION,
      headers,
      query: {
        sortField: 'createdAt',
        sortOrder: 'desc',
        size: 20,
        omitStepRuns: true,
        ...(startedAfter ? { startedAfter } : {}),
      },
    }
  )) as WorkflowExecutionListDto;
  return listed.results.map((execution) => execution.id);
};

/**
 * The investigation's after-execution hook already runs this workflow and waits for it.
 * Match that execution instead of starting another one.
 */
const findOptimizeExecution = async (
  fetch: HttpHandler,
  conversationId: string,
  startedAtMs: number
): Promise<WorkflowExecutionDto | undefined> => {
  const deadline = Date.now() + EXECUTION_LOOKUP_MS;
  const startedAfter = new Date(startedAtMs).toISOString();
  let restrictToRun = true;
  do {
    const ids = await listOptimizeExecutionIds(fetch, restrictToRun ? startedAfter : undefined);
    for (const id of ids) {
      const execution = await readExecution(fetch, id, {
        includeInput: true,
        includeOutput: true,
      });
      if (conversationIdOf(execution) === conversationId) {
        return await waitForOptimizeExecution(fetch, execution);
      }
    }
    // A raw timestamp can be dropped by the datemath bound. Search the latest executions once.
    if (restrictToRun) {
      restrictToRun = false;
      continue;
    }
    if (Date.now() >= deadline) break;
    await delay(POLL_INTERVAL_MS);
  } while (Date.now() < deadline);
  return undefined;
};

/** The post-execution workflow can still be in its cortex step when the investigation reports done. */
const waitForOptimizeExecution = async (
  fetch: HttpHandler,
  execution: WorkflowExecutionDto
): Promise<WorkflowExecutionDto> => {
  const deadline = Date.now() + MAX_WAIT_MS;
  let current = execution;
  while (!isTerminal(current.status) && Date.now() < deadline) {
    await delay(POLL_INTERVAL_MS);
    current = await readExecution(fetch, current.id, { includeInput: true, includeOutput: true });
  }
  return current;
};

const investigatorResponse = async (
  fetch: HttpHandler,
  conversationId: string,
  fallback: string | undefined
): Promise<string> => {
  try {
    const conversation = await fetch<{ rounds: Array<{ response?: { message?: string } }> }>(
      `/api/agent_builder/conversations/${encodeURIComponent(conversationId)}`,
      { headers: { 'elastic-api-version': API_VERSION } }
    );
    return conversation.rounds.at(-1)?.response?.message || fallback || '';
  } catch {
    return fallback || '';
  }
};

/**
 * Runs one Customer-0 investigation and grades the reinforcement submit its post-execution
 * hook already produced.
 */
export const runCustomer0Reinforcement = async ({
  esClient,
  fetch,
  connector,
  example,
}: {
  esClient: Client;
  fetch: HttpHandler;
  connector: Pick<EvalConnector, 'id'>;
  example: InvestigationExample;
}): Promise<ReinforcementTaskOutput> => {
  const startedAtMs = Date.now();
  const investigation = await runInvestigation(fetch, example, connector, {
    timeoutMs: CUSTOMER0_REINFORCEMENT_TIMEOUT_MS,
  });
  const conversationId = investigation.conversation_id;
  const base: ReinforcementTaskOutput = {
    case_id: example.metadata.case_id,
    prior_mermaid: '',
    tree_id: '',
    submissions: [],
    response: investigation.structured_report?.conclusion,
  };
  if (!conversationId) {
    return {
      ...base,
      execution_error: investigation.execution_error ?? 'Investigation did not start.',
    };
  }

  const response = await investigatorResponse(
    fetch,
    conversationId,
    investigation.structured_report?.conclusion
  );
  let execution: WorkflowExecutionDto | undefined;
  try {
    execution = await findOptimizeExecution(fetch, conversationId, startedAtMs);
  } catch (error) {
    return {
      ...base,
      response,
      execution_error: error instanceof Error ? error.message : String(error),
    };
  }
  if (!execution) {
    return {
      ...base,
      response,
      execution_error:
        investigation.execution_error ??
        'No post-execution reinforcement run was found for this investigation.',
    };
  }

  const reinforce = reinforceStep(execution);
  const output = reinforce?.output as
    | {
        submissions_json?: string;
        skipped?: boolean;
        trace_id?: string;
      }
    | undefined;
  const submissions = parseSubmissions(output?.submissions_json);
  const treeIds = treeIdsInSubmission(submissions.at(-1));
  const trees = await treesAfterRun(esClient, treeIds, startedAtMs);
  const reinforced = reinforce?.status === ExecutionStatus.COMPLETED && output?.skipped !== true;
  const failed = execution.status !== ExecutionStatus.COMPLETED || !reinforced;

  return {
    ...base,
    response,
    execution_id: execution.id,
    ...(output?.trace_id ? { traceId: output.trace_id } : {}),
    workflow_status: execution.status,
    execution_error: failed
      ? execution.error?.message ||
        (output?.skipped || reinforce?.status === ExecutionStatus.SKIPPED
          ? 'Decision-tree reinforcement was skipped. Select NIGHTSHIFT_DATASETS=reinforcement so decision trees and the sandbox are enabled.'
          : `Workflow ${execution.status}; reinforce step ${reinforce?.status ?? 'missing'}`)
      : undefined,
    submissions,
    tree_id: trees[0]?.tree_id ?? '',
    prior_mermaid: trees
      .map((tree) => `# ${tree.tree_id}\n${tree.prior_mermaid ?? '(no prior tree)'}`)
      .join('\n\n'),
    submitted_mermaid: trees
      .map((tree) => `# ${tree.tree_id}\n${tree.submitted_mermaid ?? ''}`)
      .join('\n\n'),
    trees,
  };
};
