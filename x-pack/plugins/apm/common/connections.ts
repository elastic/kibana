/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { AgentName } from '../typings/es_schemas/ui/fields/agent';
import { Coordinate } from '../typings/timeseries';

export enum NodeType {
  service = 'service',
  dependency = 'dependency',
}

interface NodeBase {
  id: string;
}

export interface ServiceNode extends NodeBase {
  type: NodeType.service;
  serviceName: string;
  agentName: AgentName;
  environment: string;
  dependencyName?: string;
}

export interface DependencyNode extends NodeBase {
  type: NodeType.dependency;
  dependencyName: string;
  spanType: string;
  spanSubtype: string;
}

export type Node = ServiceNode | DependencyNode;

export interface ConnectionStats {
  latency: {
    value: number | null;
    timeseries: Coordinate[];
  };
  throughput: {
    value: number | null;
    timeseries: Coordinate[];
  };
  errorRate: {
    value: number | null;
    timeseries: Coordinate[];
  };
  totalTime: {
    value: number | null;
    timeseries: Coordinate[];
  };
}

export interface ConnectionStatsItem {
  location: Node;
  stats: ConnectionStats;
}

export interface ConnectionStatsItemWithImpact extends ConnectionStatsItem {
  stats: ConnectionStatsItem['stats'] & {
    impact: number;
  };
}

export interface ConnectionStatsItemWithComparisonData {
  location: Node;
  currentStats: ConnectionStatsItemWithImpact['stats'];
  previousStats: ConnectionStatsItemWithImpact['stats'] | null;
}

export function getNodeName(node: Node) {
  return node.type === NodeType.service
    ? node.serviceName
    : node.dependencyName;
}
