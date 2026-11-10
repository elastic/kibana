/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { setTimeout as delay } from 'timers/promises';
import type { Client, estypes } from '@elastic/elasticsearch';
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
  symptomSlugFromTreeId,
  symptomTreeId,
  REPLAY_CONVERSATION_ID_PREFIX,
} from '@kbn/nightshift-decision-trees';
import type { EvalConnector } from '@kbn/evals';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  ExecutionStatus,
  TerminalExecutionStatuses,
  type WorkflowExecutionDto,
  type WorkflowExecutionListDto,
} from '@kbn/workflows';
import { NIGHTSHIFT_AGENT_OPTIMIZE_WORKFLOW_ID } from '@kbn/workflows/managed';
import type { Hypothesis } from '@kbn/agentic-investigations-plugin/common';
import { runInvestigation } from '../investigation/task';
import type { InvestigationExample } from '../investigation/types';
import { parseSubmissions, treeIdsInSubmission } from './arguments';
import type { ReinforcementExample, ReinforcementTaskOutput, SubmitArguments } from './types';

const API_VERSION = '2023-10-31';
const SPACE_ID = 'default';
/**
 * The investigation stays in progress while its post-execution hook waits for reinforcement
 * (bounded at 900s), on top of the investigation itself.
 */
export const CUSTOMER0_REINFORCEMENT_TIMEOUT_MS = 45 * 60_000;
/** Reinforce is bounded at 900s; wiki optimize can use its branch timeout first. */
const MAX_WAIT_MS = 20 * 60_000;
/** How long to wait for the post-execution execution to be searchable after the investigation. */
const EXECUTION_LOOKUP_MS = 30_000;
const POLL_INTERVAL_MS = 5_000;
/** How long a cancelled replay may take to stop before its trees are restored anyway. */
const CANCEL_WAIT_MS = 60_000;
/** `prepare_turn` rejects a longer conversation id. */
const MAX_CONVERSATION_ID_LENGTH = 512;

const headers = { 'elastic-api-version': API_VERSION };

const headId = (treeId: string): string => {
  const symptom = treeId.replace(/^symptom:/, '');
  return `${SPACE_ID}:dtree_${symptom}`;
};

const versionId = (treeId: string, version: number): string => `${headId(treeId)}_v${version}`;

interface IndexedTreeDoc {
  id: string;
  source: Record<string, unknown>;
}

const VERSION_PAGE_SIZE = 100;
const TREE_ID_PAGE_SIZE = 500;

const errorType = (error: unknown): string | undefined => {
  const candidate = (error ?? {}) as {
    meta?: { body?: { error?: { type?: string } } };
    body?: { error?: { type?: string } };
  };
  return candidate.meta?.body?.error?.type ?? candidate.body?.error?.type;
};

const statusCodeOf = (error: unknown): number | undefined => {
  const candidate = (error ?? {}) as {
    statusCode?: number;
    status?: number;
    meta?: { statusCode?: number };
  };
  return candidate.statusCode ?? candidate.meta?.statusCode ?? candidate.status;
};

/** A missing index is an empty snapshot. Any other search failure must abort the replay. */
const isIndexNotFound = (error: unknown): boolean => {
  const type = errorType(error);
  if (type) return type === 'index_not_found_exception';
  return statusCodeOf(error) === 404;
};

/** A missing document or index: nothing to snapshot or delete. */
const isMissingDocument = (error: unknown): boolean => {
  const type = errorType(error);
  if (type === 'index_not_found_exception' || type === 'document_missing_exception') return true;
  return statusCodeOf(error) === 404 && type === undefined;
};

/**
 * Every version document for one tree. Pages to completion in version order so a later cleanup
 * cannot delete a version this snapshot never saw.
 */
const listVersionDocs = async (esClient: Client, treeId: string): Promise<IndexedTreeDoc[]> => {
  const docs: IndexedTreeDoc[] = [];
  let searchAfter: Array<string | number> | undefined;
  for (;;) {
    let versions;
    try {
      versions = await esClient.search<Record<string, unknown>>({
        index: DECISION_TREE_AI_INDEX_DEST,
        size: VERSION_PAGE_SIZE,
        track_total_hits: false,
        sort: [
          { 'attributes.version': { order: 'asc', unmapped_type: 'long' } },
          { '@timestamp': { order: 'asc', unmapped_type: 'date' } },
        ],
        ...(searchAfter ? { search_after: searchAfter } : {}),
        query: {
          bool: {
            filter: [
              { term: { type: 'decision_tree_version' } },
              { term: { 'attributes.tree_id': treeId } },
              { term: { 'attributes.space_id': SPACE_ID } },
            ],
          },
        },
      });
    } catch (error) {
      if (docs.length === 0 && isIndexNotFound(error)) return [];
      throw error;
    }

    const hits = versions.hits.hits;
    for (const hit of hits) {
      if (hit._id && hit._source) {
        docs.push({ id: hit._id, source: hit._source });
      }
    }
    if (hits.length < VERSION_PAGE_SIZE) return docs;

    const cursor = hits[hits.length - 1]?.sort;
    if (!cursor || cursor.length === 0) {
      throw new Error(
        `Decision tree version search for ${treeId} returned a full page without a cursor`
      );
    }
    searchAfter = cursor as Array<string | number>;
  }
};

/** Head and version documents for one tree, so a replay can put the space back afterward. */
export const snapshotDecisionTree = async (
  esClient: Client,
  treeId: string
): Promise<IndexedTreeDoc[]> => {
  const docs: IndexedTreeDoc[] = [];
  try {
    const head = await esClient.get<Record<string, unknown>>({
      index: DECISION_TREE_AI_INDEX_DEST,
      id: headId(treeId),
    });
    if (head.found && head._source) {
      docs.push({ id: headId(treeId), source: head._source });
    }
  } catch (error) {
    if (!isMissingDocument(error)) throw error;
  }

  docs.push(...(await listVersionDocs(esClient, treeId)));
  return docs;
};

/**
 * Deletes what the replay wrote for `treeId` and puts the previous documents back. Deletes wait for
 * a refresh, so the next example's snapshot, which lists versions by search, cannot see them. Keeps
 * going past a failed delete or write, so a pre-existing tree is never left without its head, and
 * throws the first error at the end.
 */
export const restoreDecisionTree = async (
  esClient: Client,
  treeId: string,
  snapshot: readonly IndexedTreeDoc[]
): Promise<void> => {
  const current = await snapshotDecisionTree(esClient, treeId);
  let firstError: unknown;
  for (const doc of current) {
    try {
      await esClient.delete({
        index: DECISION_TREE_AI_INDEX_DEST,
        id: doc.id,
        refresh: 'wait_for',
      });
    } catch (error) {
      // A concurrent delete already removed it. Anything else leaves replay documents behind.
      if (!isMissingDocument(error)) firstError ??= error;
    }
  }
  for (const doc of snapshot) {
    try {
      await esClient.index({
        index: DECISION_TREE_AI_INDEX_DEST,
        id: doc.id,
        document: doc.source,
        refresh: 'wait_for',
      });
    } catch (error) {
      firstError ??= error;
    }
  }
  if (firstError !== undefined) throw firstError;
};

/**
 * Distinct tree ids of the space's documents matching `filter`. Throws on a full page, since a
 * partial list would leave trees out.
 */
const searchTreeIds = async (
  esClient: Client,
  filter: estypes.QueryDslQueryContainer[],
  fullPageMessage: string
): Promise<string[]> => {
  let response;
  try {
    response = await esClient.search<{ attributes?: { tree_id?: unknown } }>({
      index: DECISION_TREE_AI_INDEX_DEST,
      size: TREE_ID_PAGE_SIZE,
      track_total_hits: false,
      _source: ['attributes.tree_id'],
      query: { bool: { filter: [...filter, { term: { 'attributes.space_id': SPACE_ID } }] } },
    });
  } catch (error) {
    if (isIndexNotFound(error)) return [];
    throw error;
  }

  const hits = response.hits.hits;
  if (hits.length >= TREE_ID_PAGE_SIZE) throw new Error(fullPageMessage);
  const ids = hits
    .map((hit) => hit._source?.attributes?.tree_id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);
  return [...new Set(ids)];
};

/**
 * Tree ids of every head document in the space. Throws on a full page, since a partial list would
 * leave trees out of the snapshot.
 */
export const listDecisionTreeIds = (esClient: Client): Promise<string[]> =>
  searchTreeIds(
    esClient,
    [{ term: { type: 'decision_tree' } }],
    `The ${SPACE_ID} space has ${TREE_ID_PAGE_SIZE} or more decision trees, so the replay cannot snapshot all of them`
  );

/**
 * Tree ids `conversationId` wrote: a head or version carrying its commit provenance, or a head whose
 * last counts-only write it made (`counts_conversation_id`).
 */
export const listDecisionTreeIdsForConversation = async (
  esClient: Client,
  conversationId: string
): Promise<string[]> => {
  const tooMany = `Conversation ${conversationId} wrote ${TREE_ID_PAGE_SIZE} or more decision tree documents, so the replay cannot list the trees it owns`;
  const [committed, counted] = await Promise.all([
    searchTreeIds(
      esClient,
      [
        { terms: { type: ['decision_tree', 'decision_tree_version'] } },
        { term: { 'attributes.conversation_id': conversationId } },
      ],
      tooMany
    ),
    searchTreeIds(
      esClient,
      [
        { term: { type: 'decision_tree' } },
        { term: { 'attributes.counts_conversation_id': conversationId } },
      ],
      tooMany
    ),
  ]);
  return [...new Set([...committed, ...counted])];
};

/**
 * Snapshots every tree in the space plus `treeIds`. Which trees the replay owns is only known
 * afterward, so this covers any tree it might turn out to own.
 */
export const snapshotDecisionTrees = async (
  esClient: Client,
  treeIds: readonly string[]
): Promise<Map<string, IndexedTreeDoc[]>> => {
  const ids = new Set([...(await listDecisionTreeIds(esClient)), ...treeIds]);
  const snapshots = new Map<string, IndexedTreeDoc[]>();
  for (const id of ids) {
    snapshots.set(id, await snapshotDecisionTree(esClient, id));
  }
  return snapshots;
};

/**
 * Rolls back only the trees the replay owns: `treeIds` plus every tree `conversationId` wrote,
 * including a counts-only traversal the replay never got to report. An owned tree in `snapshots` is
 * put back and one absent from it is deleted; every other tree, including one another investigation
 * wrote meanwhile, is left alone. Keeps going past a failed tree and throws the first error at the
 * end.
 */
export const restoreDecisionTrees = async (
  esClient: Client,
  snapshots: ReadonlyMap<string, readonly IndexedTreeDoc[]>,
  { treeIds, conversationId }: { treeIds: readonly string[]; conversationId: string }
): Promise<void> => {
  let firstError: unknown;
  let stampedIds: string[] = [];
  try {
    stampedIds = await listDecisionTreeIdsForConversation(esClient, conversationId);
  } catch (error) {
    firstError = error;
  }
  for (const id of new Set([...treeIds, ...stampedIds])) {
    try {
      await restoreDecisionTree(esClient, id, snapshots.get(id) ?? []);
    } catch (error) {
      firstError ??= error;
    }
  }
  if (firstError !== undefined) throw firstError;
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

/** A unique conversation id per replay, so `prepare_turn` runs it as a first round. */
const replayConversationId = (caseId: string): string => {
  const suffix = `-${randomUUID()}`;
  const room = MAX_CONVERSATION_ID_LENGTH - REPLAY_CONVERSATION_ID_PREFIX.length - suffix.length;
  return `${REPLAY_CONVERSATION_ID_PREFIX}${caseId.slice(0, room)}${suffix}`;
};

/** Stops an execution the replay gave up on, so it cannot write trees after they are restored. */
const cancelExecution = async (
  fetch: HttpHandler,
  executionId: string,
  log: Pick<ToolingLog, 'warning'> | undefined
): Promise<void> => {
  try {
    await fetch(`/api/workflows/executions/${encodeURIComponent(executionId)}/cancel`, {
      method: 'POST',
      version: API_VERSION,
      headers,
    });
    const deadline = Date.now() + CANCEL_WAIT_MS;
    let execution = await readExecution(fetch, executionId);
    while (!isTerminal(execution.status)) {
      if (Date.now() >= deadline) {
        log?.warning(
          `Workflow execution ${executionId} is still ${execution.status} after cancel; restoring trees anyway`
        );
        return;
      }
      await delay(POLL_INTERVAL_MS);
      execution = await readExecution(fetch, executionId);
    }
  } catch (error) {
    log?.warning(`Could not cancel workflow execution ${executionId}: ${String(error)}`);
  }
};

/** The same step id is recorded twice; only the later one carries the agent output. */
const reinforceStep = (execution: WorkflowExecutionDto) =>
  [...(execution.stepExecutions ?? [])].reverse().find((step) => {
    if (step.stepId !== 'reinforce_decision_trees' || step.output == null) return false;
    return typeof step.output === 'object';
  });

/** Tree ids the submissions name, in the `symptom:<slug>` form the plugin stores trees under. */
const submittedTreeIds = (submissions: readonly SubmitArguments[]): string[] => [
  ...new Set(
    submissions
      .flatMap((submission) => treeIdsInSubmission(submission))
      .map(symptomSlugFromTreeId)
      .filter((slug) => slug.length > 0)
      .map(symptomTreeId)
  ),
];

const headContent = (treeId: string, docs: readonly IndexedTreeDoc[] | undefined) => {
  const content = docs?.find((doc) => doc.id === headId(treeId))?.source.content;
  return typeof content === 'string' ? content : undefined;
};

/**
 * The seeded tree and every other tree the submissions name, each with its head before the replay
 * and after it, so the grader checks every tree the replay touched. Must run before rollback.
 */
const replayTreesAfterRun = async (
  esClient: Client,
  example: ReinforcementExample,
  submissions: readonly SubmitArguments[],
  snapshots: ReadonlyMap<string, readonly IndexedTreeDoc[]>
): Promise<NonNullable<ReinforcementTaskOutput['trees']>> => {
  const { tree_id: seededId, markdown: seededMarkdown } = example.input.prior_tree;
  const trees: NonNullable<ReinforcementTaskOutput['trees']> = [
    {
      tree_id: seededId,
      prior_mermaid: seededMarkdown,
      submitted_mermaid: (await readSubmittedMarkdown(esClient, seededId)) ?? seededMarkdown,
    },
  ];
  const seededSlug = symptomSlugFromTreeId(seededId);
  const otherIds = new Set(
    submittedTreeIds(submissions).filter((id) => symptomSlugFromTreeId(id) !== seededSlug)
  );
  for (const treeId of otherIds) {
    trees.push({
      tree_id: treeId,
      prior_mermaid: headContent(treeId, snapshots.get(treeId)),
      submitted_mermaid: await readSubmittedMarkdown(esClient, treeId),
    });
  }
  return trees;
};

/**
 * Replays one investigation round through the agent-optimize workflow as a `replay` run, so the
 * reinforcement agent builds the round from the supplied tool calls instead of reading a
 * conversation. Returns the submit arguments plus the seeded tree and every tree the submissions
 * name as the replay left them, then rolls back only the trees the replay owns: the seeded tree,
 * every tree its submissions name, and every tree committed under its conversation id.
 */
export const runReinforcementExample = async ({
  esClient,
  fetch,
  connectorId,
  example,
  log,
}: {
  esClient: Client;
  fetch: HttpHandler;
  connectorId: string;
  example: ReinforcementExample;
  log?: Pick<ToolingLog, 'warning'>;
}): Promise<ReinforcementTaskOutput> => {
  const { tree_id: treeId, markdown: priorMarkdown } = example.input.prior_tree;
  const base: ReinforcementTaskOutput = {
    case_id: example.metadata.case_id,
    prior_mermaid: priorMarkdown,
    tree_id: treeId,
    submissions: [],
  };

  const snapshots = await snapshotDecisionTrees(esClient, [treeId]);
  const conversationId = replayConversationId(example.metadata.case_id);
  let submissions: SubmitArguments[] = [];
  let executionId: string | undefined;
  let sawTerminal = false;
  try {
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
            conversation_id: conversationId,
            round_id: example.metadata.case_id,
            replay: true,
            agent_id: NIGHTSHIFT_INVESTIGATION_AGENT_ID,
            connector_id: connectorId,
            tool_calls: example.input.tool_calls,
            tool_results: example.input.tool_results,
          },
        }),
      }
    )) as { workflowExecutionId: string };

    executionId = started.workflowExecutionId;
    const deadline = Date.now() + MAX_WAIT_MS;
    let execution = await readExecution(fetch, executionId);
    sawTerminal = isTerminal(execution.status);
    while (!sawTerminal && Date.now() < deadline) {
      await delay(POLL_INTERVAL_MS);
      execution = await readExecution(fetch, executionId);
      sawTerminal = isTerminal(execution.status);
    }

    const reinforce = reinforceStep(execution);
    const output = reinforce?.output as
      | {
          submissions_json?: string;
          skipped?: boolean;
          trace_id?: string;
          submit_rejected?: boolean;
        }
      | undefined;
    submissions = parseSubmissions(output?.submissions_json);
    const trees = await replayTreesAfterRun(esClient, example, submissions, snapshots);
    const finished = sawTerminal;
    const reinforced = reinforce?.status === ExecutionStatus.COMPLETED && output?.skipped !== true;
    const submitRejected = output?.submit_rejected === true;
    const failed =
      !finished || execution.status !== ExecutionStatus.COMPLETED || !reinforced || submitRejected;

    return {
      ...base,
      execution_id: executionId,
      ...(output?.trace_id ? { traceId: output.trace_id } : {}),
      workflow_status: execution.status,
      execution_error: failed
        ? submitRejected
          ? 'The reinforcement submit was rejected, so this round is not a successful reinforcement.'
          : execution.error?.message ||
            (output?.skipped || reinforce?.status === ExecutionStatus.SKIPPED
              ? 'Decision-tree reinforcement was skipped. Select NIGHTSHIFT_DATASETS=reinforcement so decision trees and the sandbox are enabled.'
              : `Workflow ${execution.status}; reinforce step ${reinforce?.status ?? 'missing'}`)
        : undefined,
      submissions,
      submitted_mermaid: trees[0].submitted_mermaid,
      trees,
    };
  } finally {
    if (executionId && !sawTerminal) {
      await cancelExecution(fetch, executionId, log);
    }
    await restoreDecisionTrees(esClient, snapshots, {
      treeIds: [treeId, ...submittedTreeIds(submissions)],
      conversationId,
    });
  }
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
  attributes?: {
    version?: number | string;
    conversation_id?: string;
    counts_conversation_id?: string;
  };
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

/** The newest version another conversation committed, skipping every commit this run made. */
const versionBeforeRun = async (
  esClient: Client,
  treeId: string,
  headVersion: number,
  conversationId: string
): Promise<StoredTree | undefined> => {
  for (let version = headVersion - 1; version >= 1; version--) {
    const doc = await readTreeDoc(esClient, versionId(treeId, version));
    if (doc?.attributes?.conversation_id !== conversationId) return doc;
  }
  return undefined;
};

/**
 * Trees the run wrote, by commit provenance, plus every tree its last submit names. A tree only a
 * rejected earlier submit named is left out. Prior is the tree before this run's first commit when
 * it committed, otherwise the existing head.
 */
export const treesAfterRun = async (
  esClient: Client,
  submissions: readonly SubmitArguments[],
  conversationId: string
): Promise<NonNullable<ReinforcementTaskOutput['trees']>> => {
  const lastSubmitted = new Set(submittedTreeIds(submissions.slice(-1)));
  const trees: NonNullable<ReinforcementTaskOutput['trees']> = [];
  for (const treeId of submittedTreeIds(submissions)) {
    const head = await readTreeDoc(esClient, headId(treeId));
    const committed = head?.attributes?.conversation_id === conversationId;
    const counted = head?.attributes?.counts_conversation_id === conversationId;
    if (!lastSubmitted.has(treeId) && !committed && !counted) continue;
    const version = Number(head?.attributes?.version);
    const previous =
      committed && version > 1
        ? await versionBeforeRun(esClient, treeId, version, conversationId)
        : undefined;
    trees.push({
      tree_id: treeId,
      prior_mermaid: committed ? previous?.content : head?.content,
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

/** The post-execution workflow can still be in its wiki step when the investigation reports done. */
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
 * The investigator records hypotheses through `set_hypotheses`, not in its prose, so their statuses
 * are appended for the grader to tell whether the round confirmed a cause.
 */
const withHypotheses = (response: string, hypotheses: Hypothesis[] | undefined): string =>
  hypotheses?.length ? `${response}\n\n${JSON.stringify({ hypotheses })}` : response;

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

  const response = withHypotheses(
    await investigatorResponse(fetch, conversationId, investigation.structured_report?.conclusion),
    investigation.structured_report?.hypotheses
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
        submit_rejected?: boolean;
      }
    | undefined;
  const submissions = parseSubmissions(output?.submissions_json);
  const trees = await treesAfterRun(esClient, submissions, conversationId);
  const reinforced = reinforce?.status === ExecutionStatus.COMPLETED && output?.skipped !== true;
  const submitRejected = output?.submit_rejected === true;
  const failed = execution.status !== ExecutionStatus.COMPLETED || !reinforced || submitRejected;

  return {
    ...base,
    response,
    execution_id: execution.id,
    ...(output?.trace_id ? { traceId: output.trace_id } : {}),
    workflow_status: execution.status,
    execution_error: failed
      ? submitRejected
        ? 'The reinforcement submit was rejected, so this round is not a successful reinforcement.'
        : execution.error?.message ||
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
