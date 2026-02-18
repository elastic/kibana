/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { materializeGraph } from './materialize_graph';
export type {
  DependencyGraphDocument,
  GraphNode,
  GraphConnection,
  GraphData,
  MaterializeGraphResponse,
} from './types';
export { GRAPH_INDEX, buildExternalNodeId } from './utils';
export {
  getPrecomputedServiceMap,
  isPrecomputedServiceMapAvailable,
  convertEdgesToServiceMapSpans,
} from './get_precomputed_service_map';
