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
  DiscoveredService,
  ConnectionElement,
  ExternalConnectionNode,
  ServiceConnectionNode,
  ServicesResponse,
  ServiceMapResponse,
  ServiceMapTelemetry,
  NodeStats,
  NodeItem,
} from './typings';
import type { GroupResourceNodesResponse } from './group_resource_nodes';

export * from './utils';
export { getConnections } from './get_service_map_from_trace_ids';
export {
  transformServiceMapResponses,
  getConnectionNodeId,
  getExternalConnectionNode,
  getServiceConnectionNode,
  getConnectionId,
  isSpan,
} from './transform_service_map_responses';

export {
  Connection,
  ConnectionEdge,
  ConnectionNode,
  DiscoveredService,
  ConnectionElement,
  GroupResourceNodesResponse,
  ExternalConnectionNode,
  ServiceConnectionNode,
  ServicesResponse,
  ServiceMapResponse,
  ServiceMapTelemetry,
  NodeStats,
  NodeItem,
};
