/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export {
  NodeType,
  type ServiceNode,
  type DependencyNode,
  type Node,
  type ConnectionStats,
  type ConnectionStatsItem,
  type ConnectionStatsItemWithImpact,
  type ConnectionStatsItemWithComparisonData,
} from '@kbn/apm-types';
import { NodeType, type Node } from '@kbn/apm-types';

export function getNodeName(node: Node) {
  return node.type === NodeType.service ? node.serviceName : node.dependencyName;
}
