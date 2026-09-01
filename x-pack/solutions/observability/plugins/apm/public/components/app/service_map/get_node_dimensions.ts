/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceMapNode } from '../../../../common/service_map';
import { NODE_WIDTH, NODE_HEIGHT } from '../../../../common/service_map/constants';

/**
 * Width of a node, preferring React Flow's measured size and falling back to the configured default
 * when the node has not been measured yet.
 */
export const getNodeWidth = (node: ServiceMapNode): number =>
  node.measured?.width ?? node.width ?? NODE_WIDTH;

/** Height of a node, with the same measured to default fallback as {@link getNodeWidth}. */
export const getNodeHeight = (node: ServiceMapNode): number =>
  node.measured?.height ?? node.height ?? NODE_HEIGHT;
