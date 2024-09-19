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
  backend = 'backend',
}

interface NodeBase {
  id: string;
}

export interface ServiceNode extends NodeBase {
  type: NodeType.service;
  serviceName: string;
  agentName: AgentName;
  environment: string;
}

export interface BackendNode extends NodeBase {
  type: NodeType.backend;
  backendName: string;
  spanType: string;
  spanSubtype: string;
}

export type Node = ServiceNode | BackendNode;

export interface ConnectionStatsItem {
  location: Node;
  stats: {
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
  };
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
  return node.type === NodeType.service ? node.serviceName : node.backendName;
}
