/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { orderByTime } from '../process_event';
import { IndexedGraph } from '../../types';
import { ResolverNode } from '../../../../common/endpoint/types';
import { levelOrder as baseLevelOrder } from '../../lib/tree_sequencers';
import * as nodeModel from '../../../../common/endpoint/models/node';

/**
 * Create a new IndexedGraph from an array of ProcessEvents.
 * siblings will be ordered by timestamp
 */
export function factory(
  // Array of processes to index as a tree
  nodes: ResolverNode[],
  originId: string | undefined
): IndexedGraph {
  const idToChildren = new Map<string | undefined, ResolverNode[]>();
  const idToValue = new Map<string, ResolverNode>();

  for (const node of nodes) {
    const nodeId: string | undefined = nodeModel.nodeID(node);
    if (nodeId !== undefined) {
      idToValue.set(nodeId, node);

      const uniqueParentId: string | undefined = nodeModel.parentId(node);

      let childrenWithTheSameParent = idToChildren.get(uniqueParentId);
      if (!childrenWithTheSameParent) {
        childrenWithTheSameParent = [];
        idToChildren.set(uniqueParentId, childrenWithTheSameParent);
      }
      childrenWithTheSameParent.push(node);
    }
  }

  // sort the children of each node
  for (const siblings of idToChildren.values()) {
    siblings.sort(orderByTime);
  }

  return {
    idToChildren,
    idToNode: idToValue,
    originId,
  };
}

/**
 * Returns an array with any children `ProcessEvent`s of the passed in `process`
 */
export function children(graph: IndexedGraph, parentID: string | undefined): ResolverNode[] {
  const currentSiblings = graph.idToChildren.get(parentID);
  return currentSiblings === undefined ? [] : currentSiblings;
}

/**
 * Get the indexed process event for the ID
 */
export function graphNode(graph: IndexedGraph, entityID: string): ResolverNode | null {
  return graph.idToNode.get(entityID) ?? null;
}

/**
 * Returns the parent ProcessEvent, if any, for the passed in `childProcess`
 */
export function parent(graph: IndexedGraph, childNode: ResolverNode): ResolverNode | undefined {
  const uniqueParentId = nodeModel.parentId(childNode);
  if (uniqueParentId === undefined) {
    return undefined;
  } else {
    return graph.idToNode.get(uniqueParentId);
  }
}

/**
 * Number of processes in the tree
 */
export function size(graph: IndexedGraph) {
  return graph.idToNode.size;
}

/**
 * Return the root process
 */
export function root(graph: IndexedGraph) {
  if (size(graph) === 0) {
    return null;
  }
  // any node will do
  let current: ResolverNode = graph.idToNode.values().next().value;

  // iteratively swap current w/ its parent
  while (parent(graph, current) !== undefined) {
    current = parent(graph, current)!;
  }
  return current;
}

/**
 * Yield processes in level order
 */
export function* levelOrder(graph: IndexedGraph) {
  const rootNode = root(graph);
  if (rootNode !== null) {
    yield* baseLevelOrder(rootNode, (parentNode: ResolverNode): ResolverNode[] =>
      children(graph, nodeModel.nodeID(parentNode))
    );
  }
}
