/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { State, Node } from '../types';

export function analyzeDag(state: State) {
  const result: Array<{
    id: string;
    isStartNode: boolean;
    isTerminalNode: boolean;
    inputNodeIds: string[];
    nextNodeId?: string;
    node: Node;
  }> = [];

  const metadata: Record<string, any> = { ...state.nodes };

  const entriesWithDependencies = Object.entries(state.nodes).filter(
    ([, node]) => node.inputNodeIds.length > 0
  );

  entriesWithDependencies.forEach(([id, node]) => {
    node.inputNodeIds.forEach(inputNodeId => {
      metadata[inputNodeId].nextNodeId = id;
    });
  });

  Object.entries(metadata).forEach(([id, node]) => {
    result.push({
      id,
      inputNodeIds: node.inputNodeIds,
      isStartNode: node.inputNodeIds.length === 0,
      isTerminalNode: !node.nextNodeId,
      nextNodeId: node.nextNodeId,
      node,
    });
  });

  return result.sort((a, b) => {
    return a.isStartNode ? -1 : a.isTerminalNode ? -1 : 1;
  });
}
