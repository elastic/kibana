/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Separates the parts of a key; node ids and conditions never contain it. */
const KEY_SEPARATOR = '\u0000';

/** Edge identity shared by the version diff and the counts: source, target and condition, ignoring ✅. */
export const decisionEdgeKey = ({
  source_node_id: sourceNodeId,
  target_node_id: targetNodeId,
  condition,
}: {
  source_node_id: string;
  target_node_id: string;
  condition: string;
}): string => [sourceNodeId, targetNodeId, condition].join(KEY_SEPARATOR);

/** Identity of the ordered node pair an edge joins, whatever its condition. */
export const nodePairKey = ({
  source_node_id: sourceNodeId,
  target_node_id: targetNodeId,
}: {
  source_node_id: string;
  target_node_id: string;
}): string => [sourceNodeId, targetNodeId].join(KEY_SEPARATOR);
