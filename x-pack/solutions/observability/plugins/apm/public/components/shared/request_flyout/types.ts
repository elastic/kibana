/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * All the data identifying a single connection in the service map.
 * Derived from ServiceMapEdgeData at the call site in graph.tsx.
 */
export interface RequestFlyoutConnection {
  /** service.name of the source (caller) service. */
  sourceServiceName: string;
  /** Display label for the source end of the edge (= service.name or a label override). */
  sourceLabel: string;
  /** Display label for the target end of the edge. */
  targetLabel: string;
  /**
   * span.destination.service.resource values that this edge represents.
   * A single service→service edge can cover multiple resources.
   */
  dependencies: string[];
  /**
   * For service→service edges: service.name of the target (callee) service.
   * When present the transaction query uses a trace-level join instead of a
   * resource-based join — see get_connection_transactions.ts for details.
   */
  targetServiceName?: string;
  /**
   * The first dependency name, used for routes that accept a single value.
   * Undefined for service→service edges with no dependency name.
   */
  dependencyName?: string;
  /** True when this edge aggregates multiple outgoing edges into a synthetic "Externals" group. */
  isGrouped?: boolean;
  /**
   * True when this edge represents a messaging-queue consumer edge (dependency → service).
   * No metrics are available for these edges.
   */
  isMessagingConsumer?: boolean;
}
