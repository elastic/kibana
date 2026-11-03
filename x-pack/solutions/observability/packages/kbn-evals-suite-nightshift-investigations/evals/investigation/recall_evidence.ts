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

/** A recall directory the bash call ran in, such as `/workspace/memories` or `/workspace/cortex/db`. */
const RECALL_DIRECTORY_RE = /(?:^|\/)((cortex|memories)(?:\/[^\s'"]*)?)\/?$/;

/** A relative file argument such as `checkout.md` or `notes/db.txt`. */
const RELATIVE_FILE_RE = /^(?![-/~$.])[\w./-]+\.[a-z0-9]+$/i;

interface RecallPath {
  kind: RecallKind;
  path: string;
}

/** `renderResult` prefixes the first line of a bash result with its exit code. */
const RESULT_PREFIX_RE = /^exit_code: \d+ \| stdout: ?/;

/** A result line that starts with a file name: `grep -r` output (`./a.md:3:text`) or a `find` / `ls` listing. */
const RESULT_FILE_RE = /^(?:\.\/)?((?:[\w.-]+\/)*[\w.-]+\.[a-z][a-z0-9]*)(?::|$)/i;

/**
 * A bash command run from inside `cortex/` or `memories/` reads those files by relative name
 * (`grep timeout checkout.md`), so resolve each file argument against the working directory.
 * A command naming no file (`grep -r timeout .`, `find . -name '*.md'`) is read from its output
 * instead, one file per result line, so only files the output actually exposes are credited. A
 * truncated or filename-free output (`ls`, `grep -h`) exposes none, and none are guessed.
 */
const readsFromWorkingDirectory = (
  command: string,
  result: string,
  workingDirectory: string
): RecallPath[] => {
  const match = RECALL_DIRECTORY_RE.exec(workingDirectory);
  if (!match) return [];
  const [, rawDirectory, kind] = match;
  const directory = rawDirectory.replace(/\/+$/, '');
  const resolve = (files: string[]): RecallPath[] =>
    files.map((file) => ({ kind: kind as RecallKind, path: `${directory}/${file}` }));
  const argumentFiles = command
    .split(/[\s|;&<>()]+/)
    .map((token) => token.replace(/^['"]|['"]$/g, ''))
    .filter((token) => RELATIVE_FILE_RE.test(token));
  if (argumentFiles.length > 0) return resolve(argumentFiles);
  return resolve(
    result.split('\n').flatMap((line) => {
      const [, file] = RESULT_FILE_RE.exec(line.replace(RESULT_PREFIX_RE, '').trim()) ?? [];
      return file ? [file] : [];
    })
  );
};

const recallPathsOf = ({ tool_id: toolId, params, result }: TrajectoryStep): RecallPath[] => {
  if (toolId === VIEW_FILE_TOOL_ID && typeof params.file_path === 'string') {
    return [...params.file_path.matchAll(RECALL_PATH_RE)].map(([, path, kind]) => ({
      kind: kind as RecallKind,
      path,
    }));
  }
  if (toolId === BASH_TOOL_ID && typeof params.command === 'string') {
    const named = [...params.command.matchAll(RECALL_PATH_RE)].map(([, path, kind]) => ({
      kind: kind as RecallKind,
      path,
    }));
    return typeof params.working_directory === 'string'
      ? [...named, ...readsFromWorkingDirectory(params.command, result, params.working_directory)]
      : named;
  }
  return [];
};

/**
 * Cortex (`cortex/`, knowledge past investigations wrote down) and semantic-memory (`memories/`)
 * files the agent referenced through the sandbox view-file or bash tools, first reference per path.
 * Whether a read succeeded is left to the judge: a missing file's error is in the step's result.
 */
export const extractRecallReads = (trajectory: TrajectoryStep[] | undefined): RecallRead[] => {
  const reads = new Map<string, RecallRead>();
  (trajectory ?? []).forEach((step, index) => {
    for (const { kind, path } of recallPathsOf(step)) {
      if (!reads.has(path)) reads.set(path, { kind, path, step: index + 1 });
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
