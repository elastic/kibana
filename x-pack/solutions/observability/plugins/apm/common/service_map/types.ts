/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type cytoscape from 'cytoscape';
import type { AgentName } from '@kbn/apm-types/src/es_schemas/ui/fields';
import type { AGENT_NAME, SERVICE_ENVIRONMENT, SERVICE_NAME } from '@kbn/apm-types';
import type { SPAN_DESTINATION_SERVICE_RESOURCE, SPAN_SUBTYPE, SPAN_TYPE } from '@kbn/apm-types';
import type { ServiceAnomaliesResponse } from '../../server/routes/service_map/get_service_anomalies';
import type { Coordinate } from '../../typings/timeseries';
import type { ServiceAnomalyStats } from '../anomaly_detection';

export interface ServiceMapTelemetry {
  tracesCount: number;
  nodesCount: number;
}

export type GroupedConnection = { label: string } & (ConnectionNode | ConnectionEdge);

export interface GroupedNode {
  data: {
    id: string;
    'span.type': string;
    label: string;
    groupedConnections: GroupedConnection[];
  };
}

export interface GroupedEdge {
  data: {
    id: string;
    source: string;
    target: string;
  };
}

export interface GroupResourceNodesResponse extends Pick<ServiceMapTelemetry, 'nodesCount'> {
  elements: Array<GroupedNode | GroupedEdge | ConnectionElement>;
}

export type ConnectionType = Connection | ConnectionLegacy;
export type DestinationType = ExitSpanDestination | ExitSpanDestinationLegacy;

export interface ServiceMapConnections {
  servicesData: ServicesResponse[];
  anomalies: ServiceAnomaliesResponse;
  connections: Connection[];
  exitSpanDestinations: ExitSpanDestination[];
}

export interface ServiceMapRawResponse {
  spans: ServiceMapSpan[];
  servicesData: ServicesResponse[];
  anomalies: ServiceAnomaliesResponse;
}

export type ServiceMapResponse =
  | Pick<ServiceMapTelemetry, 'tracesCount'> & (ServiceMapRawResponse | GroupResourceNodesResponse);

export interface ServicesResponse {
  [SERVICE_NAME]: string;
  [AGENT_NAME]: string;
  [SERVICE_ENVIRONMENT]: string | null;
}

export type ServiceConnectionNode = cytoscape.NodeDataDefinition &
  ServicesResponse & {
    id: string;
    serviceAnomalyStats?: ServiceAnomalyStats;
    label?: string;
  };
export interface ExternalConnectionNode extends cytoscape.NodeDataDefinition {
  id: string;
  [SPAN_DESTINATION_SERVICE_RESOURCE]: string;
  [SPAN_TYPE]: string;
  [SPAN_SUBTYPE]: string;
  label?: string;
}

export type ConnectionNode = ServiceConnectionNode | ExternalConnectionNode;
export type ConnectionNodeLegacy =
  | Omit<ServiceConnectionNode, 'id'>
  | Omit<ExternalConnectionNode, 'id'>;

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
export interface ConnectionLegacy {
  source: ConnectionNodeLegacy;
  destination: ConnectionNodeLegacy;
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

export type ExitSpanDestinationType = ExitSpanDestination | ExitSpanDestinationLegacy;
export interface ExitSpanDestination {
  from: ExternalConnectionNode;
  to: ServiceConnectionNode;
}

export interface ExitSpanDestinationLegacy {
  from: Omit<ExternalConnectionNode, 'id'>;
  to: Omit<ServiceConnectionNode, 'id'>;
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
export type ServiceMapSpan = ServiceMapExitSpan & {
  destinationService?: ServiceMapService;
};
