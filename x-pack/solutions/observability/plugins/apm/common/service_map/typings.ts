/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type cytoscape from 'cytoscape';
import type { AgentName } from '@kbn/apm-types/src/es_schemas/ui/fields';
import type { DEFAULT_ANOMALIES } from '../../server/routes/service_map/get_service_anomalies';
import type { Coordinate } from '../../typings/timeseries';
import type { ServiceAnomalyStats } from '../anomaly_detection';

export interface ServiceMapTelemetry {
  tracesCount: number;
}

export type ServiceMapResponse = {
  spans: ServiceMapSpan[];
  servicesData: ServicesResponse[];
  anomalies: typeof DEFAULT_ANOMALIES;
} & ServiceMapTelemetry;

export interface ServicesResponse {
  'service.name': string;
  'agent.name': string;
  'service.environment': string | null;
}

export interface ServiceConnectionNode extends cytoscape.NodeDataDefinition {
  'service.name': string;
  'service.environment': string | null;
  'agent.name': string;
  serviceAnomalyStats?: ServiceAnomalyStats;
  label?: string;
}
export interface ExternalConnectionNode extends cytoscape.NodeDataDefinition {
  'span.destination.service.resource': string;
  'span.type': string;
  'span.subtype': string;
  label?: string;
}

export type ConnectionNode = ServiceConnectionNode | ExternalConnectionNode;

export interface ConnectionEdge {
  id: string;
  source: ConnectionNode['id'];
  target: ConnectionNode['id'];
  label?: string;
  bidirectional?: boolean;
  isInverseEdge?: boolean;
}

export type NodeItem = {
  id: string;
} & ConnectionNode;

export interface ConnectionElement {
  data: ConnectionNode | ConnectionEdge;
}

export interface Connection {
  source: ConnectionNode;
  destination: ConnectionNode;
}

export interface NodeStats {
  transactionStats?: {
    latency?: {
      value: number | null;
      timeseries?: Coordinate[];
    };
    throughput?: {
      value: number | null;
      timeseries?: Coordinate[];
    };
  };
  failedTransactionsRate?: {
    value: number | null;
    timeseries?: Coordinate[];
  };
  cpuUsage?: {
    value?: number | null;
    timeseries?: Coordinate[];
  };
  memoryUsage?: {
    value?: number | null;
    timeseries?: Coordinate[];
  };
}

export interface DiscoveredService {
  from: ExternalConnectionNode;
  to: ServiceConnectionNode;
}

export interface ServiceMapSpan {
  spanId: string;
  spanType: string;
  spanSubtype: string;
  spanDestinationServiceResource: string;
  serviceName: string;
  serviceEnvironment?: string;
  agentName: AgentName;
  downstreamService?: {
    agentName: AgentName;
    serviceEnvironment?: string;
    serviceName: string;
  };
}
