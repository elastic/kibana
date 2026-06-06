/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceMapNode } from '../../../../common/service_map';
import { NODE_WIDTH, NODE_HEIGHT } from '../../../../common/service_map/constants';

/** Axis-aligned bounding box around a set of nodes, in world coordinates. */
export interface NodesBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Width of a node, preferring React Flow's measured size and falling back to the configured default
 * when the node has not been measured yet.
 */
export const getNodeWidth = (node: ServiceMapNode): number =>
  node.measured?.width ?? node.width ?? NODE_WIDTH;

/** Height of a node, with the same measured to default fallback as {@link getNodeWidth}. */
export const getNodeHeight = (node: ServiceMapNode): number =>
  node.measured?.height ?? node.height ?? NODE_HEIGHT;

/**
 * Computes the world-space bounding box around `nodes`. Returns `null` for an empty list so callers
 * can decide how to handle "nothing to measure".
 */
export const getNodesBounds = (nodes: ServiceMapNode[]): NodesBounds | null => {
  if (nodes.length === 0) {
    return null;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + getNodeWidth(node));
    maxY = Math.max(maxY, node.position.y + getNodeHeight(node));
  }

  return { minX, minY, maxX, maxY };
};
