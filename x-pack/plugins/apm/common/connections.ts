/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentName } from '../typings/es_schemas/ui/fields/agent';

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

export interface Connection {
  from: Node;
  to: Node;
}

export interface ConnectionMetricItem extends Connection {
  metrics: {
    latency: {
      value: number | null;
      timeseries: Array<{ x: number; y: number | null }>;
    };
    throughput: {
      value: number | null;
      timeseries: Array<{ x: number; y: number | null }>;
    };
    errorRate: {
      value: number | null;
      timeseries: Array<{ x: number; y: number | null }>;
    };
  };
}

export interface ConnectionMetricItemWithImpact extends ConnectionMetricItem {
  metrics: ConnectionMetricItem['metrics'] & {
    impact: number;
  };
}
