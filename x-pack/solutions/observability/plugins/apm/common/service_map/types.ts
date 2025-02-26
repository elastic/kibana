/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type cytoscape from 'cytoscape';
import type { AgentName } from '@kbn/apm-types/src/es_schemas/ui/fields';
import type { ServiceAnomaliesResponse } from '../../server/routes/service_map/get_service_anomalies';
import type { Coordinate } from '../../typings/timeseries';
import type { ServiceAnomalyStats } from '../anomaly_detection';

export interface ServiceMapTelemetry {
  tracesCount: number;
}

export interface ServiceMapWithConnections
  extends Pick<ServiceMapResponse, 'servicesData' | 'anomalies'> {
  connections: Connection[];
  destinationServices: DestinationService[];
}

export type ServiceMapResponse = {
  spans: ServiceMapNode[];
  servicesData: ServicesResponse[];
  anomalies: ServiceAnomaliesResponse;
} & ServiceMapTelemetry;

export interface ServicesResponse {
  'service.name': string;
  'agent.name': string;
  'service.environment': string | null;
}

export interface ServiceConnectionNode extends cytoscape.NodeDataDefinition {
  id: string;
  'service.name': string;
  'service.environment': string | null;
  'agent.name': string;
  'service.node.name'?: string;
  serviceAnomalyStats?: ServiceAnomalyStats;
  label?: string;
}
export interface ExternalConnectionNode extends cytoscape.NodeDataDefinition {
  id: string;
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

export interface DestinationService {
  from: ExternalConnectionNode;
  to: ServiceConnectionNode;
}

export interface ServiceMapService {
  serviceName: string;
  agentName: AgentName;
  serviceEnvironment?: string;
  serviceNodeName?: string;
}

export interface ServiceMapExitSpan extends ServiceMapService {
  spanId: string;
  spanType: string;
  spanSubtype: string;
  spanDestinationServiceResource: string;
}
export type ServiceMapNode = ServiceMapExitSpan & {
  destinationService?: ServiceMapService;
};
