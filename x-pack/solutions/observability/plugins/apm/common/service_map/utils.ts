/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { Connection, ConnectionNode, ExternalConnectionNode, ServiceConnectionNode } from '.';
import {
  AGENT_NAME,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_SUBTYPE,
  SPAN_TYPE,
} from '../es_fields/apm';
import type { ConnectionEdge, ServiceMapExitSpan, ServiceMapService } from './types';

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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function getConnections(paths: ConnectionNode[][] | undefined): Connection[] {
  if (!paths) {
    return [];
  }

  const connectionsById = new Set<string>();
  const connections: Connection[] = [];

  paths.forEach((path) => {
    for (let i = 1; i < path.length; i++) {
      const connectionId = getConnectionId({ source: path[i - 1], destination: path[i] });

      if (!connectionsById.has(connectionId)) {
        connectionsById.add(connectionId);
        connections.push({ source: path[i - 1], destination: path[i] });
      }
    }
  });

  return connections;
}

export const isExitSpan = (node: ConnectionNode): node is ExternalConnectionNode => {
  return !!(node as ExternalConnectionNode)[SPAN_DESTINATION_SERVICE_RESOURCE];
};

export const getServiceConnectionNode = (event: ServiceMapService): ServiceConnectionNode => {
  return {
    id: event.serviceName,
    [SERVICE_NAME]: event.serviceName,
    [SERVICE_ENVIRONMENT]: event.serviceEnvironment || null,
    [AGENT_NAME]: event.agentName,
  };
};

export const getExternalConnectionNode = (event: ServiceMapExitSpan): ExternalConnectionNode => {
  return {
    id: `>${event.serviceName}|${event.spanDestinationServiceResource}`,
    [SPAN_DESTINATION_SERVICE_RESOURCE]: event.spanDestinationServiceResource,
    [SPAN_TYPE]: event.spanType,
    [SPAN_SUBTYPE]: event.spanSubtype,
  };
};

export function getConnectionId(connection: Connection) {
  return `${connection.source.id}~${connection.destination.id}`;
}

export const getEdgeId = ({ source, target }: Pick<ConnectionEdge, 'source' | 'target'>) =>
  `${source}|${target}`;

export const SERVICE_MAP_TIMEOUT_ERROR = 'ServiceMapTimeoutError';
