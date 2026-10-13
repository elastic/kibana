/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isToolCallStep, ToolResultType } from '@kbn/agent-builder-common';
import type { ConversationRound, ToolResult } from '@kbn/agent-builder-common';
import { symptomTreeId } from '@kbn/nightshift-decision-trees';
import type { AccessedDecisionTree } from './types';

/**
 * The investigation agent reads decision trees (symptom playbooks) with the sandbox view-file
 * tool, or by referencing the file from a bash command. These ids are plugin-server-internal
 * (`SANDBOX_VIEW_FILE_TOOL_ID` / `SANDBOX_BASH_TOOL_ID` in
 * `nightshift_investigations/server/tools/sandbox_bash/`), not part of the plugin's public API,
 * so they are mirrored here rather than imported across the module boundary. Matches the tool set
 * the server's own accessed-tree detection considers (`decision_trees/accessed_trees.ts`).
 */
const VIEW_FILE_TOOL_ID = 'nightshift_sandbox_view_file';
const BASH_TOOL_ID = 'nightshift_sandbox_bash';

/** Matches `decision_tree_<slug>.md`, mirroring the server's own accessed-tree detection. */
const TREE_FILE_RE = /(?:^|\/)decision_tree_([a-z0-9]+(?:-[a-z0-9]+)*)\.md(?:$|[^a-z0-9-])/g;

/** Every tree slug referenced in `haystack` (a file path or a bash command line). */
const slugsFromHaystack = (haystack: string): string[] => {
  const slugs: string[] = [];
  TREE_FILE_RE.lastIndex = 0;
  let match = TREE_FILE_RE.exec(haystack);
  while (match) {
    slugs.push(match[1]);
    match = TREE_FILE_RE.exec(haystack);
  }
  return slugs;
};

/** Text of a successful view-file or bash result; '' when the call did not succeed. */
const successfulResultText = (toolId: string, results: readonly ToolResult[]): string => {
  if (toolId === VIEW_FILE_TOOL_ID) {
    return results
      .filter(({ type, data }) => type === ToolResultType.other && 'text' in data)
      .map(({ data }) => String((data as { text: unknown }).text))
      .join('\n');
  }
  // Bash: only a zero exit code counts as a successful read, matching assertSuccessfulSandboxCommand.
  return results
    .filter(
      ({ type, data }) =>
        type === ToolResultType.other && 'exit_code' in data && data.exit_code === 0
    )
    .map(({ data }) => String((data as { stdout?: unknown }).stdout ?? ''))
    .join('\n');
};

/**
 * Decision trees the investigation opened via the sandbox view-file tool or a bash command
 * referencing a tree file (mirrors the server's own accessed-tree detection in
 * `decision_trees/accessed_trees.ts`), keyed by tree id, with the content of every successful
 * read appended in order (the view-file tool paginates large trees, so a single read may not
 * carry the whole file). A read that fails (missing file, non-zero exit) does not count as having
 * accessed the tree, and never clears content a prior successful read already captured.
 */
export const extractAccessedDecisionTrees = (
  rounds: Array<Pick<ConversationRound, 'steps'>>
): AccessedDecisionTree[] => {
  const chunksByTreeId = new Map<string, string[]>();
  for (const { steps } of rounds) {
    for (const { tool_id: toolId, params, results } of steps.filter(isToolCallStep)) {
      let haystack: string | undefined;
      if (toolId === VIEW_FILE_TOOL_ID && typeof params.file_path === 'string') {
        haystack = params.file_path;
      } else if (toolId === BASH_TOOL_ID && typeof params.command === 'string') {
        haystack = params.command;
      } else {
        continue;
      }
      const slugs = slugsFromHaystack(haystack);
      if (slugs.length === 0) continue;
      const text = successfulResultText(toolId, results);
      if (!text) continue;
      for (const slug of slugs) {
        const treeId = symptomTreeId(slug);
        const chunks = chunksByTreeId.get(treeId) ?? [];
        chunks.push(text);
        chunksByTreeId.set(treeId, chunks);
      }
    }
  }
  return [...chunksByTreeId].map(([tree_id, chunks]) => ({ tree_id, content: chunks.join('\n') }));
};
