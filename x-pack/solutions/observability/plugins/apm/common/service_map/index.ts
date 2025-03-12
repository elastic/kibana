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
  GroupResourceNodesResponse,
  ServiceConnectionNode,
  ServicesResponse,
  ServiceMapResponse,
  ServiceMapConnections,
  ServiceMapTelemetry,
  NodeStats,
  NodeItem,
} from './types';

export * from './utils';
export { getServiceMapNodes } from './get_service_map_nodes';
export { getPaths } from './get_paths';

export type {
  Connection,
  ConnectionEdge,
  ConnectionNode,
  ExitSpanDestination,
  ConnectionElement,
  GroupResourceNodesResponse,
  ExternalConnectionNode,
  ServiceConnectionNode,
  ServicesResponse,
  ServiceMapConnections,
  ServiceMapResponse,
  ServiceMapTelemetry,
  NodeStats,
  NodeItem,
};
