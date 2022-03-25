/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import cytoscape from 'cytoscape';
import { Coordinate } from '../typings/timeseries';
import { ServiceAnomalyStats } from './anomaly_detection';

// These should be imported, but until TypeScript 4.2 we're inlining them here.
// All instances of "agent.name", "service.name", "service.environment", "span.type",
// "span.subtype", and "span.destination.service.resource" need to be changed
// back to using the constants.
// See https://github.com/microsoft/TypeScript/issues/37888
//
// import {
//   AGENT_NAME,
//   SERVICE_ENVIRONMENT,
//   SERVICE_NAME,
//   SPAN_DESTINATION_SERVICE_RESOURCE,
//   SPAN_SUBTYPE,
//   SPAN_TYPE,
// } from './elasticsearch_fieldnames';

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
