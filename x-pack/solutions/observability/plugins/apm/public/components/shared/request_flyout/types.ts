/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EdgePayloadMetrics } from '../../app/service_map/popover/edge_payload_metrics';

/** A resource of a grouped edge, e.g. one of the HTTP APIs behind an "N resources" node. */
export interface GroupedResource {
  /** span.destination.service.resource of the resource. */
  resource: string;
  spanType?: string;
  spanSubtype?: string;
}

/**
 * All the data identifying a single connection in the service map.
 * Derived from ServiceMapEdgeData by useServiceMapEdgeFlyoutProps.
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
   * When present the transactions of the connection are joined on the parent span of the
   * target's entry transactions instead of the resource.
   */
  targetServiceName?: string;
  /** The dependency of a service→dependency edge (its span.destination.service.resource). */
  dependencyName?: string;
  /**
   * The resources behind a grouped edge (e.g. 6 redis instances). The flyout lists them and each
   * one opens a child flyout scoped to that resource.
   */
  groupedResources?: GroupedResource[];
  /**
   * Metrics that came with the map (the AI Agent map), shown when the edge has no resource to
   * fetch metrics for.
   */
  payloadMetrics?: EdgePayloadMetrics;
}

/**
 * An edge without per-connection metrics (the source is a messaging queue, or a group of
 * resources): the flyout only explains it.
 */
export interface RequestFlyoutNoMetricsConnection {
  sourceLabel: string;
  targetLabel: string;
}

export const hasMetrics = (
  connection: RequestFlyoutConnection | RequestFlyoutNoMetricsConnection
): connection is RequestFlyoutConnection => 'sourceServiceName' in connection;

/**
 * How the flyouts opened from a request flyout level are attached to the EUI flyout session
 * (EUI allows one main and one child flyout per session): `inherit` for a flyout that is the
 * child of the main one, `start` for a flyout that opens a child of its own.
 */
export type RequestFlyoutChildSession = 'inherit' | 'start';
