/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Connection,
  ConnectionEdge,
  ConnectionNode,
  ExitSpanDestination,
  ConnectionElement,
  ExternalConnectionNode,
  ServiceConnectionNode,
  ServicesResponse,
  ServiceMapResponse,
  ServiceMapWithConnections,
  ServiceMapTelemetry,
  NodeStats,
  NodeItem,
} from './types';
import type { GroupResourceNodesResponse } from './group_resource_nodes';

export * from './utils';
export { getServiceMapNodes } from './get_service_map_nodes';

export {
  Connection,
  ConnectionEdge,
  ConnectionNode,
  ExitSpanDestination as DestinationService,
  ConnectionElement,
  GroupResourceNodesResponse,
  ExternalConnectionNode,
  ServiceConnectionNode,
  ServicesResponse,
  ServiceMapWithConnections,
  ServiceMapResponse,
  ServiceMapTelemetry,
  NodeStats,
  NodeItem,
};
