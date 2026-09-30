/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isToolCallStep, ToolResultType } from '@kbn/agent-builder-common';
import type { ConversationRound } from '@kbn/agent-builder-common';
import { symptomTreeId } from '@kbn/nightshift-decision-trees';
import type { AccessedDecisionTree } from './types';

/**
 * The investigation agent reads decision trees (symptom playbooks) with the sandbox view-file
 * tool. This id is plugin-server-internal (`SANDBOX_VIEW_FILE_TOOL_ID` in
 * `nightshift_investigations/server/tools/sandbox_bash/view_file_tool.ts`), not part of the
 * plugin's public API, so it is mirrored here rather than imported across the module boundary.
 */
const VIEW_FILE_TOOL_ID = 'nightshift_sandbox_view_file';

/** Matches `decision_tree_<slug>.md`, mirroring the server's own accessed-tree detection. */
const TREE_FILE_RE = /(?:^|\/)decision_tree_([a-z0-9]+(?:-[a-z0-9]+)*)\.md(?:$|[^a-z0-9-])/;

/**
 * Decision trees the investigation opened via the sandbox view-file tool, keyed by tree id, with
 * the file content the agent actually saw. A tree opened more than once keeps its last view.
 */
export const extractAccessedDecisionTrees = (
  rounds: Array<Pick<ConversationRound, 'steps'>>
): AccessedDecisionTree[] => {
  const contentByTreeId = new Map<string, string>();
  for (const { steps } of rounds) {
    for (const { tool_id: toolId, params, results } of steps.filter(isToolCallStep)) {
      if (toolId !== VIEW_FILE_TOOL_ID || typeof params.file_path !== 'string') continue;
      const match = TREE_FILE_RE.exec(params.file_path);
      if (!match) continue;
      const text = results
        .filter(({ type }) => type === ToolResultType.other)
        .map(({ data }) => ('text' in data ? String(data.text) : ''))
        .join('\n');
      contentByTreeId.set(symptomTreeId(match[1]), text);
    }
  }
  return [...contentByTreeId].map(([tree_id, content]) => ({ tree_id, content }));
};
