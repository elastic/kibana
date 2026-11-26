/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceMapNode } from '../../../../common/service_map';

/**
 * Position of a node on the map. The members of an open group are placed relative to its box, so
 * the position of the box is added.
 */
export const getAbsoluteNodePosition = (
  node: ServiceMapNode,
  nodesById: ReadonlyMap<string, ServiceMapNode>
): { x: number; y: number } => {
  let { x, y } = node.position;
  let current: ServiceMapNode = node;
  while (current.parentId) {
    const parent = nodesById.get(current.parentId);
    if (!parent) {
      break;
    }
    x += parent.position.x;
    y += parent.position.y;
    current = parent;
  }
  return { x, y };
};
