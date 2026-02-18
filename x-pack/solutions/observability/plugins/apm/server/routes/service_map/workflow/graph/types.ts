/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Type definitions for the dependency graph materialization workflow.
 *
 * The dependency graph is a materialized view of the service map edges,
 * stored as time-series snapshots in `.apm-dependency-graph`.
 * Environment filtering is done by ES (term query on `environment`).
 * Service-focused views are derived in memory via graph traversal.
 */

export interface GraphNode {
  /** Node identifier: service name for services, ">resource" for externals */
  id: string;
  /** Whether this is an instrumented service or an external dependency */
  type: 'service' | 'external';
  /** APM agent name (e.g., "java", "nodejs") -- null for externals */
  agent_name: string | null;
  /** Service environment -- null for externals */
  environment: string | null;
  /** Span type for externals (e.g., "db", "external", "messaging") -- null for services */
  span_type: string | null;
  /** Span subtype for externals (e.g., "postgresql", "http", "kafka") -- null for services */
  span_subtype: string | null;
  /** Most recent time this node was seen (from edges or service discovery). Null if unknown. */
  last_seen_at: string | null;
}

export interface GraphConnection {
  /** Source node id */
  source: string;
  /** Target node id */
  target: string;
  /** How the connection was discovered */
  edge_type: 'exit_span' | 'span_link' | 'span_link_incoming';
  /** Span type of the connecting span */
  span_type: string | null;
  /** Span subtype of the connecting span */
  span_subtype: string | null;
}

export interface GraphData {
  nodes: GraphNode[];
  connections: GraphConnection[];
}

export interface DependencyGraphDocument {
  /** Environment this graph covers (indexed keyword, used for ES filtering) */
  environment: string;
  /** When this graph was last materialized */
  computed_at: string;
  /** Number of nodes in the graph */
  node_count: number;
  /** Number of connections in the graph */
  connection_count: number;
  /** The graph payload (stored but not indexed in ES) */
  graph_data: GraphData;
}

export interface MaterializeGraphResponse {
  /** Environment that was materialized */
  environment: string;
  /** Number of nodes in the graph */
  nodeCount: number;
  /** Number of connections in the graph */
  connectionCount: number;
}
