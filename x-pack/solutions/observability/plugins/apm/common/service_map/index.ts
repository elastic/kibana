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
  DestinationService,
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
export { getConnections } from './get_service_map_from_trace_ids';
export {
  transformServiceMapResponses,
  getExternalConnectionNode,
  getServiceConnectionNode,
  getConnectionId,
  isExitSpan,
} from './transform_service_map_responses';

export {
  Connection,
  ConnectionEdge,
  ConnectionNode,
  DestinationService,
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
