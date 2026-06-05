/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceMapNode } from '../../../../common/service_map';
import { getNodeWidth, getNodeHeight, getNodesBounds } from './get_node_dimensions';

/** A node projected into minimap pixel space. */
export interface MinimapNodeRect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  node: ServiceMapNode;
}

/** The full, computed minimap geometry in pixel space, plus the world window it maps to. */
export interface MinimapView {
  /** Pixel width of the minimap svg (fixed). */
  width: number;
  /** Pixel height of the minimap svg (fixed). */
  height: number;
  /** World→minimap pixel scale factor (uniform; tracks the main pane zoom). */
  scale: number;
  /** Top-left of the world window the minimap displays (for pixel→world mapping). */
  windowMinX: number;
  windowMinY: number;
  /** Visible nodes that intersect the window, projected into minimap pixel space. */
  nodes: MinimapNodeRect[];
  /** The current main-pane viewport, projected (and clamped) into minimap pixel space. */
  viewport: { x: number; y: number; width: number; height: number };
  /** Whether graph content extends beyond the displayed window in each direction. */
  overflow: { left: boolean; right: boolean; top: boolean; bottom: boolean };
  /**
   * Whether the camera (main-pane viewport) is *entirely* beyond the minimap box in each direction —
   * i.e. the user has panned fully outside what the minimap can show (partial overflow is not
   * flagged). Used to surface a "camera off-screen" indicator since the projected viewport rectangle
   * is clamped to the box.
   */
  cameraOverflow: { left: boolean; right: boolean; top: boolean; bottom: boolean };
}

interface GetMinimapViewParams {
  nodes: ServiceMapNode[];
  /** React Flow transform `[translateX, translateY, zoom]`. */
  transform: [number, number, number];
  /** Pixel width of the React Flow pane. */
  paneWidth: number;
  /** Pixel height of the React Flow pane. */
  paneHeight: number;
  /** Fixed pixel width of the minimap box. */
  width: number;
  /** Fixed pixel height of the minimap box. */
  height: number;
  /**
   * How many viewports of surrounding context the minimap shows. The minimap window is this many
   * viewports wide/tall (clamped to the graph), so its scale tracks the main pane zoom: zooming in
   * shrinks the window and zooms the minimap in, zooming out grows it until it reaches the full graph.
   */
  contextViewports: number;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

/**
 * Positions a window of `windowSize` along one axis: centered on `center` and clamped within
 * `[fullMin, fullMax]` when the window is smaller than the graph, or centered on the graph when the
 * window is larger (so a zoomed-out minimap shows the whole graph centered).
 */
const placeWindow = (
  center: number,
  windowSize: number,
  fullMin: number,
  fullMax: number
): number => {
  if (windowSize >= fullMax - fullMin) {
    return (fullMin + fullMax) / 2 - windowSize / 2;
  }
  return clamp(center - windowSize / 2, fullMin, fullMax - windowSize);
};

/**
 * Computes the minimap geometry as a window of context around the current viewport.
 *
 * The window is `contextViewports` viewports wide/tall (clamped to the graph bounds), so the minimap
 * zoom **tracks the main pane zoom**: zooming in shrinks the window (minimap zooms in too), zooming
 * out grows it until the whole graph is shown. The window is expanded to the box's aspect ratio so the
 * rendered box is always a fixed size with uniform, undistorted scaling. The viewport rectangle shows
 * the portion currently visible in the main pane, and overflow flags indicate where the graph extends
 * beyond the displayed window.
 *
 * @returns the computed geometry, or `null` when there is nothing to render yet (pane not measured or
 * no visible nodes).
 */
export function getMinimapView({
  nodes,
  transform,
  paneWidth,
  paneHeight,
  width: boxWidth,
  height: boxHeight,
  contextViewports,
}: GetMinimapViewParams): MinimapView | null {
  const [translateX, translateY, zoom] = transform;
  const visibleNodes = nodes.filter((node) => !node.hidden);
  const bounds = getNodesBounds(visibleNodes);

  // Nothing to render yet: pane/box not measured, no visible nodes, or an invalid zoom.
  if (
    !bounds ||
    paneWidth <= 0 ||
    paneHeight <= 0 ||
    zoom <= 0 ||
    boxWidth <= 0 ||
    boxHeight <= 0
  ) {
    return null;
  }

  const { minX: fullMinX, minY: fullMinY, maxX: fullMaxX, maxY: fullMaxY } = bounds;

  // The world rectangle currently visible in the main pane.
  const viewportWorldX = -translateX / zoom;
  const viewportWorldY = -translateY / zoom;
  const viewportWorldWidth = paneWidth / zoom;
  const viewportWorldHeight = paneHeight / zoom;
  const viewportCenterX = viewportWorldX + viewportWorldWidth / 2;
  const viewportCenterY = viewportWorldY + viewportWorldHeight / 2;

  // Window the minimap displays: a fixed multiple of the current viewport, so the minimap scale is
  // always proportional to the main pane zoom (zoom in → window shrinks → minimap zooms in too). It is
  // never allowed to grow past the full graph by much, but is NOT pinned to the graph size, otherwise
  // zooming in on a small graph would leave the minimap scale unchanged.
  let windowWidth = viewportWorldWidth * contextViewports;
  let windowHeight = viewportWorldHeight * contextViewports;

  // Expand the window to the box's aspect ratio so the rendered box is a fixed size with uniform
  // scaling (no distortion).
  const boxAspect = boxWidth / boxHeight;
  if (windowWidth / windowHeight > boxAspect) {
    windowHeight = windowWidth / boxAspect;
  } else {
    windowWidth = windowHeight * boxAspect;
  }

  const windowMinX = placeWindow(viewportCenterX, windowWidth, fullMinX, fullMaxX);
  const windowMinY = placeWindow(viewportCenterY, windowHeight, fullMinY, fullMaxY);

  const scale = boxWidth / windowWidth;

  // World → minimap-pixel projection for the current window.
  const projectX = (worldX: number): number => (worldX - windowMinX) * scale;
  const projectY = (worldY: number): number => (worldY - windowMinY) * scale;

  const projectedNodes: MinimapNodeRect[] = [];
  for (const node of visibleNodes) {
    const width = getNodeWidth(node);
    const height = getNodeHeight(node);
    // Skip nodes fully outside the window.
    if (
      node.position.x + width < windowMinX ||
      node.position.x > windowMinX + windowWidth ||
      node.position.y + height < windowMinY ||
      node.position.y > windowMinY + windowHeight
    ) {
      continue;
    }
    projectedNodes.push({
      id: node.id,
      x: projectX(node.position.x),
      y: projectY(node.position.y),
      width: Math.max(1, width * scale),
      height: Math.max(1, height * scale),
      node,
    });
  }

  // Project the viewport edges into box pixels (unclamped), then clamp the rendered rect to the box.
  // When zoomed/panned far out the raw edges fall outside [0, box], which both keeps the rect at most
  // full-size and tells us the camera has moved beyond what the minimap shows (cameraOverflow).
  const rawViewportLeft = projectX(viewportWorldX);
  const rawViewportTop = projectY(viewportWorldY);
  const rawViewportRight = projectX(viewportWorldX + viewportWorldWidth);
  const rawViewportBottom = projectY(viewportWorldY + viewportWorldHeight);

  const viewportLeft = clamp(rawViewportLeft, 0, boxWidth);
  const viewportTop = clamp(rawViewportTop, 0, boxHeight);
  const viewportRight = clamp(rawViewportRight, 0, boxWidth);
  const viewportBottom = clamp(rawViewportBottom, 0, boxHeight);

  // Half a pixel of tolerance so float noise doesn't flag phantom overflow.
  const epsilon = 0.5;

  return {
    width: boxWidth,
    height: boxHeight,
    scale,
    windowMinX,
    windowMinY,
    nodes: projectedNodes,
    viewport: {
      x: viewportLeft,
      y: viewportTop,
      width: viewportRight - viewportLeft,
      height: viewportBottom - viewportTop,
    },
    // There is graph content beyond the displayed window in this direction.
    overflow: {
      left: windowMinX > fullMinX + epsilon,
      right: windowMinX + windowWidth < fullMaxX - epsilon,
      top: windowMinY > fullMinY + epsilon,
      bottom: windowMinY + windowHeight < fullMaxY - epsilon,
    },
    // The camera is *entirely* beyond the minimap box in this direction (no overlap left), i.e. the
    // user has panned fully out of view. Partial overflow is intentionally not flagged.
    cameraOverflow: {
      left: rawViewportRight <= epsilon,
      right: rawViewportLeft >= boxWidth - epsilon,
      top: rawViewportBottom <= epsilon,
      bottom: rawViewportTop >= boxHeight - epsilon,
    },
  };
}

/** Maps a point in minimap pixel space back to world coordinates (for click/drag navigation). */
export function minimapPointToWorld(
  view: MinimapView,
  pixelX: number,
  pixelY: number
): { x: number; y: number } {
  return {
    x: view.windowMinX + pixelX / view.scale,
    y: view.windowMinY + pixelY / view.scale,
  };
}
