/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ResolverTree,
  ResolverNodeStats,
  ResolverLifecycleNode,
  SafeResolverEvent,
  NewResolverTree,
  ResolverNode,
  EventStats,
  ResolverSchema,
} from '../../../common/endpoint/types';
import * as nodeModel from '../../../common/endpoint/models/node';

/**
 * These values are only exported for testing. They should not be used directly. Instead use the functions below.
 */

/**
 * The limit for the ancestors in the server request when the ancestry field is defined in the schema.
 */
export const ancestorsWithAncestryField = 200;
/**
 * The limit for the ancestors in the server request when the ancestry field is not defined in the schema.
 */
export const ancestorsWithoutAncestryField = 20;
/**
 * The limit for the generations in the server request when the ancestry field is defined. Essentially this means
 * that the generations field will be ignored when the ancestry field is defined.
 */
export const generationsWithAncestryField = 0;
/**
 * The limit for the generations in the server request when the ancestry field is not defined.
 */
export const generationsWithoutAncestryField = 10;
/**
 * The limit for the descendants in the server request.
 */
export const descendantsLimit = 500;

/**
 * Returns the number of ancestors we should use when requesting a tree from the server
 * depending on whether the schema received from the server has the ancestry field defined.
 */
export function ancestorsRequestAmount(schema: ResolverSchema | undefined) {
  return schema?.ancestry !== undefined
    ? ancestorsWithAncestryField
    : ancestorsWithoutAncestryField;
}

/**
 * Returns the number of generations we should use when requesting a tree from the server
 * depending on whether the schema received from the server has the ancestry field defined.
 */
export function generationsRequestAmount(schema: ResolverSchema | undefined) {
  return schema?.ancestry !== undefined
    ? generationsWithAncestryField
    : generationsWithoutAncestryField;
}

/**
 * The number of the descendants to use in a request to the server for a resolver tree.
 */
export function descendantsRequestAmount() {
  return descendantsLimit;
}

/**
 * This returns a map of nodeIDs to the associated stats provided by the datasource.
 */
export function nodeStats(tree: NewResolverTree): Map<ResolverNode['id'], EventStats> {
  const stats = new Map();

  for (const node of tree.nodes) {
    if (node.stats) {
      const nodeID = nodeModel.nodeID(node);
      stats.set(nodeID, node.stats);
    }
  }
  return stats;
}

/**
 * ResolverTree is a type returned by the server.
 */

/**
 * This returns the 'LifecycleNodes' of the tree. These nodes have
 * the entityID and stats for a process. Used by `relatedEventsStats`.
 *
 * @deprecated use indexed_process_tree instead
 */
function lifecycleNodes(tree: ResolverTree): ResolverLifecycleNode[] {
  return [tree, ...tree.children.childNodes, ...tree.ancestry.ancestors];
}

/**
 * All the process events
 *
 * @deprecated use nodeData instead
 */
export function lifecycleEvents(tree: ResolverTree) {
  const events: SafeResolverEvent[] = [...tree.lifecycle];
  for (const { lifecycle } of tree.children.childNodes) {
    events.push(...lifecycle);
  }
  for (const { lifecycle } of tree.ancestry.ancestors) {
    events.push(...lifecycle);
  }
  return events;
}

/**
 * This returns a map of entity_ids to stats for the related events and alerts.
 *
 * @deprecated use indexed_process_tree instead
 */
export function relatedEventsStats(tree: ResolverTree): Map<string, ResolverNodeStats> {
  const nodeRelatedEventStats: Map<string, ResolverNodeStats> = new Map();
  for (const node of lifecycleNodes(tree)) {
    if (node.stats) {
      nodeRelatedEventStats.set(node.entityID, node.stats);
    }
  }
  return nodeRelatedEventStats;
}

/**
 * ResolverTree type is returned by the server. It organizes events into a complex structure. The
 * organization of events in the tree is done to associate metadata with the events. The client does not
 * use this metadata. Instead, the client flattens the tree into an array. Therefore we can safely
 * make a malformed ResolverTree for the purposes of the tests, so long as it is flattened in a predictable way.
 */
export function mock({
  nodes,
}: {
  /**
   * Events represented by the ResolverTree.
   */
  nodes: ResolverNode[];
}): NewResolverTree | null {
  if (nodes.length === 0) {
    return null;
  }
  const originNode = nodes[0];
  const originID = nodeModel.nodeID(originNode);
  if (!originID) {
    throw new Error('first mock event must include an nodeID.');
  }
  return {
    originID,
    nodes,
  };
}
