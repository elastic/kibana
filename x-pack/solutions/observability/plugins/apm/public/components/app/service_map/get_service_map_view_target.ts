/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Rect } from '@xyflow/react';
import type { ServiceMapNode } from '../../../../common/service_map';
import { FIT_VIEW_PADDING, MIN_ZOOM } from './constants';
import { getNodeWidth, getNodeHeight } from './get_node_dimensions';

/**
 * The view to apply on initial load: either fit the whole graph, or center on a world point when the
 * graph is too large to fit without clamping to {@link MIN_ZOOM}.
 */
export type ServiceMapViewTarget = { kind: 'fit' } | { kind: 'center'; x: number; y: number };

interface GetServiceMapViewTargetParams {
  /** Visible nodes; callers are expected to filter out hidden nodes. */
  nodes: ServiceMapNode[];
  /** Bounding box of `nodes`, from React Flow's `getNodesBounds`. */
  bounds: Rect;
  /** Pixel width of the React Flow pane. */
  viewportWidth: number;
  /** Pixel height of the React Flow pane. */
  viewportHeight: number;
}

/** Median is robust to far-flung outlier nodes, which would skew a mean toward empty space. */
const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
};

/**
 * Decides how to position the camera on the initial load of the service map.
 *
 * `fitView` centers on the bounding-box center and clamps to {@link MIN_ZOOM}. For large, sprawling
 * graphs (for example many disconnected dependencies spread far apart) the bounding-box center can
 * be empty space, so the user lands on nothing. In that case, center on the median node position at
 * {@link MIN_ZOOM} so the user lands on content while still fitting as much of the map as possible.
 * Normal-sized graphs that fit within {@link MIN_ZOOM} keep using `fitView`.
 */
export function getServiceMapViewTarget({
  nodes,
  bounds,
  viewportWidth,
  viewportHeight,
}: GetServiceMapViewTargetParams): ServiceMapViewTarget {
  if (nodes.length === 0 || viewportWidth <= 0 || viewportHeight <= 0) {
    return { kind: 'fit' };
  }

  const graphWidth = Math.max(bounds.width, 1);
  const graphHeight = Math.max(bounds.height, 1);

  const fitZoom =
    Math.min(viewportWidth / graphWidth, viewportHeight / graphHeight) * (1 - FIT_VIEW_PADDING);

  if (fitZoom >= MIN_ZOOM) {
    return { kind: 'fit' };
  }

  const centerX = median(nodes.map((node) => node.position.x + getNodeWidth(node) / 2));
  const centerY = median(nodes.map((node) => node.position.y + getNodeHeight(node) / 2));

  return { kind: 'center', x: centerX, y: centerY };
}
