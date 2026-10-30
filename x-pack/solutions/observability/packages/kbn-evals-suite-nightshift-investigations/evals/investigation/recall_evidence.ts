/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TrajectoryStep } from './types';

export type RecallKind = 'cortex' | 'memories';

/** A cortex or semantic-memory file the agent opened (or tried to), and the 1-based trajectory step. */
export interface RecallRead {
  kind: RecallKind;
  path: string;
  step: number;
}

/** Mirrors the sandbox tool ids the truthfulness judge's prompt names (see `decision_tree_evidence.ts`). */
const VIEW_FILE_TOOL_ID = 'nightshift_sandbox_view_file';
const BASH_TOOL_ID = 'nightshift_sandbox_bash';

const RECALL_PATH_RE = /(?:^|[\s'"=/])((cortex|memories)\/[^\s'"|;&<>)]+)/g;

const haystackOf = ({ tool_id: toolId, params }: TrajectoryStep): string | undefined => {
  if (toolId === VIEW_FILE_TOOL_ID && typeof params.file_path === 'string') return params.file_path;
  if (toolId === BASH_TOOL_ID && typeof params.command === 'string') return params.command;
  return undefined;
};

/**
 * Cortex (`cortex/`, knowledge past investigations wrote down) and semantic-memory (`memories/`)
 * files the agent referenced through the sandbox view-file or bash tools, first reference per path.
 * Whether a read succeeded is left to the judge: a missing file's error is in the step's result.
 */
export const extractRecallReads = (trajectory: TrajectoryStep[] | undefined): RecallRead[] => {
  const reads = new Map<string, RecallRead>();
  (trajectory ?? []).forEach((step, index) => {
    const haystack = haystackOf(step);
    if (!haystack) return;
    for (const [, path, kind] of haystack.matchAll(RECALL_PATH_RE)) {
      if (!reads.has(path)) reads.set(path, { kind: kind as RecallKind, path, step: index + 1 });
    }
  });
  return [...reads.values()];
};

/** The reads of one kind as a bulleted list for a judge prompt, or '' when there are none. */
export const composeRecallReadsText = (reads: RecallRead[], kind: RecallKind): string =>
  reads
    .filter((read) => read.kind === kind)
    .map(({ path, step }) => `- ${path} (trajectory step ${step})`)
    .join('\n');
