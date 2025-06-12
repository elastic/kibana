/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type {
  Connection,
  ConnectionNode,
  ExternalConnectionNode,
  ServiceConnectionNode,
} from './types';
import {
  AGENT_NAME,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_SUBTYPE,
  SPAN_TYPE,
} from '../es_fields/apm';
import type { ConnectionNodeLegacy, ServiceMapExitSpan, ServiceMapService } from './types';

export const invalidLicenseMessage = i18n.translate('xpack.apm.serviceMap.invalidLicenseMessage', {
  defaultMessage:
    "In order to access Service Maps, you must be subscribed to an Elastic Platinum license. With it, you'll have the ability to visualize your entire application stack along with your APM data.",
});

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
    (nongroupedSubType) => nongroupedSubType === 'all' || nongroupedSubType === subtype
  );
}

export function getConnections(
  paths: Array<Array<ConnectionNode | ConnectionNodeLegacy>> | undefined
): Connection[] {
  if (!paths) {
    return [];
  }

  const connectionsById = new Set<string>();
  const connections: Connection[] = [];

  paths.forEach((path) => {
    for (let i = 1; i < path.length; i++) {
      const sourceNode = (
        'id' in path[i - 1] ? path[i - 1] : { ...path[i - 1], id: getLegacyNodeId(path[i - 1]) }
      ) as ConnectionNode;
      const destinationNode = (
        'id' in path[i] ? path[i] : { ...path[i], id: getLegacyNodeId(path[i]) }
      ) as ConnectionNode;

      const connectionId = getEdgeId(sourceNode.id, destinationNode.id);

      if (!connectionsById.has(connectionId)) {
        connectionsById.add(connectionId);
        connections.push({ source: sourceNode, destination: destinationNode });
      }
    }
  });

  return connections;
}

export const isExitSpan = (
  node: ConnectionNode | ConnectionNodeLegacy
): node is ExternalConnectionNode => {
  return !!(node as ExternalConnectionNode)[SPAN_DESTINATION_SERVICE_RESOURCE];
};

// backward compatibility with scrited_metric versions
export function getLegacyNodeId(node: ConnectionNodeLegacy) {
  if (isExitSpan(node)) {
    return getExitSpanNodeId(node);
  }
  return `${node[SERVICE_NAME]}`;
}

export function getServiceConnectionNode(event: ServiceMapService): ServiceConnectionNode {
  return {
    id: event.serviceName,
    [SERVICE_NAME]: event.serviceName,
    [SERVICE_ENVIRONMENT]: event.serviceEnvironment || null,
    [AGENT_NAME]: event.agentName,
  };
}

export function getExternalConnectionNode(event: ServiceMapExitSpan): ExternalConnectionNode {
  return {
    id: `>${event.serviceName}|${event.spanDestinationServiceResource}`,
    [SPAN_DESTINATION_SERVICE_RESOURCE]: event.spanDestinationServiceResource,
    [SPAN_TYPE]: event.spanType,
    [SPAN_SUBTYPE]: event.spanSubtype,
  };
}

export function getEdgeId(sourceId: string, destinationId: string) {
  return `${sourceId}~${destinationId}`;
}

export function getExitSpanNodeId(span: ExternalConnectionNode) {
  return `>${span[SPAN_DESTINATION_SERVICE_RESOURCE]}`;
}

export const SERVICE_MAP_TIMEOUT_ERROR = 'ServiceMapTimeoutError';
