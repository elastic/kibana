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

/** The connection of a service map edge, as the request flyout needs it. */
export interface RequestFlyoutConnection {
  sourceServiceName: string;
  sourceLabel: string;
  targetLabel: string;
  /** span.destination.service.resource values of the edge; a service → service edge can cover several. */
  dependencies: string[];
  /** service.name of the target of a service → service edge. */
  targetServiceName?: string;
  /** span.destination.service.resource of a service → dependency edge. */
  dependencyName?: string;
  /** The resources behind a grouped edge; each one opens a child flyout scoped to it. */
  groupedResources?: GroupedResource[];
  /** Metrics that came with the map (AI Agent map), for edges without resources to fetch them for. */
  payloadMetrics?: EdgePayloadMetrics;
}

/** An edge without per-connection metrics (messaging queue source, outgoing grouped edge). */
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
