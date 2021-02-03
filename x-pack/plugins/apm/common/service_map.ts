/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import cytoscape from 'cytoscape';
import {
  AGENT_NAME,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_SUBTYPE,
  SPAN_TYPE,
} from './elasticsearch_fieldnames';
import { ServiceAnomalyStats } from './anomaly_detection';

export interface ServiceConnectionNode extends cytoscape.NodeDataDefinition {
  [SERVICE_NAME]: string;
  [SERVICE_ENVIRONMENT]: string | null;
  [AGENT_NAME]: string;
  serviceAnomalyStats?: ServiceAnomalyStats;
  label?: string;
}
export interface ExternalConnectionNode extends cytoscape.NodeDataDefinition {
  [SPAN_DESTINATION_SERVICE_RESOURCE]: string;
  [SPAN_TYPE]: string;
  [SPAN_SUBTYPE]: string;
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

export interface ConnectionElement {
  data: ConnectionNode | ConnectionEdge;
}

export interface Connection {
  source: ConnectionNode;
  destination: ConnectionNode;
}

export interface ServiceNodeStats {
  avgMemoryUsage: number | null;
  avgCpuUsage: number | null;
  transactionStats: {
    avgTransactionDuration: number | null;
    avgRequestsPerMinute: number | null;
  };
  avgErrorRate: number | null;
}

export const invalidLicenseMessage = i18n.translate(
  'xpack.apm.serviceMap.invalidLicenseMessage',
  {
    defaultMessage:
      "In order to access Service Maps, you must be subscribed to an Elastic Platinum license. With it, you'll have the ability to visualize your entire application stack along with your APM data.",
  }
);

const NONGROUPED_SPANS: Record<string, string[]> = {
  aws: ['servicename'],
  cache: ['all'],
  db: ['all'],
  external: ['graphql', 'grpc', 'websocket'],
  messaging: ['all'],
  template: ['handlebars'],
};

export function isSpanGroupingSupported(type?: string, subtype?: string) {
  if (!type || !(type in NONGROUPED_SPANS)) {
    return true;
  }
  return !NONGROUPED_SPANS[type].some(
    (nongroupedSubType) =>
      nongroupedSubType === 'all' || nongroupedSubType === subtype
  );
}

export const SERVICE_MAP_TIMEOUT_ERROR = 'ServiceMapTimeoutError';
