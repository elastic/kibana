/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceMapNode } from '../../../../common/service_map';
import { getMinimapView, minimapPointToWorld } from './get_minimap_view';

const makeNode = (x: number, y: number, overrides: Partial<ServiceMapNode> = {}): ServiceMapNode =>
  ({
    id: `${x}-${y}`,
    position: { x, y },
    data: {},
    ...overrides,
  } as ServiceMapNode);

const BASE = {
  paneWidth: 1200,
  paneHeight: 600,
  width: 200,
  height: 140,
  contextViewports: 3,
};

/** Builds a transform `[tx, ty, zoom]` that centers the viewport on a world point. */
const transformCenteredOn = (
  worldX: number,
  worldY: number,
  zoom: number,
  paneWidth: number,
  paneHeight: number
): [number, number, number] => {
  const viewportWorldX = worldX - paneWidth / zoom / 2;
  const viewportWorldY = worldY - paneHeight / zoom / 2;
  return [-viewportWorldX * zoom, -viewportWorldY * zoom, zoom];
};

describe('getMinimapView', () => {
  it('returns null when there are no visible nodes', () => {
    expect(getMinimapView({ ...BASE, nodes: [], transform: [0, 0, 1] })).toBeNull();
    expect(
      getMinimapView({
        ...BASE,
        nodes: [makeNode(0, 0, { hidden: true })],
        transform: [0, 0, 1],
      })
    ).toBeNull();
  });

  it('returns null when the pane has not been measured yet', () => {
    expect(
      getMinimapView({
        ...BASE,
        paneWidth: 0,
        paneHeight: 0,
        nodes: [makeNode(0, 0)],
        transform: [0, 0, 1],
      })
    ).toBeNull();
  });

  it('always renders a fixed-size box', () => {
    const small = getMinimapView({
      ...BASE,
      nodes: [makeNode(0, 0), makeNode(400, 200)],
      transform: [0, 0, 1],
    })!;
    const sprawling = getMinimapView({
      ...BASE,
      nodes: [makeNode(0, 0), makeNode(100000, 4000)],
      transform: transformCenteredOn(50000, 2000, 0.5, BASE.paneWidth, BASE.paneHeight),
    })!;

    expect(small.width).toBe(BASE.width);
    expect(small.height).toBe(BASE.height);
    expect(sprawling.width).toBe(BASE.width);
    expect(sprawling.height).toBe(BASE.height);
  });

  it('couples the minimap scale to the main pane zoom (zoom in → minimap zooms in)', () => {
    const nodes = [makeNode(0, 0), makeNode(100000, 50000), makeNode(50000, 25000)];

    const zoomedOut = getMinimapView({
      ...BASE,
      nodes,
      transform: transformCenteredOn(50000, 25000, 0.01, BASE.paneWidth, BASE.paneHeight),
    })!;
    const zoomedIn = getMinimapView({
      ...BASE,
      nodes,
      transform: transformCenteredOn(50000, 25000, 0.1, BASE.paneWidth, BASE.paneHeight),
    })!;

    // 10x the main zoom → ~10x the minimap scale.
    expect(zoomedIn.scale).toBeGreaterThan(zoomedOut.scale);
    expect(zoomedIn.scale / zoomedOut.scale).toBeCloseTo(10, 0);
  });

  it('keeps a constant window-to-viewport ratio so the scale tracks zoom even for small graphs', () => {
    const nodes = [makeNode(0, 0), makeNode(400, 200), makeNode(200, 100)];

    const z1 = getMinimapView({ ...BASE, nodes, transform: [0, 0, 1] })!;
    const z2 = getMinimapView({ ...BASE, nodes, transform: [0, 0, 2] })!;

    // Zooming in must change the minimap scale (regression: it used to clamp to the graph and freeze).
    expect(z2.scale).toBeGreaterThan(z1.scale);
  });

  it('scales uniformly (window matches the box aspect ratio)', () => {
    const nodes = [makeNode(0, 0), makeNode(100000, 4000), makeNode(50000, 2000)];
    const view = getMinimapView({
      ...BASE,
      nodes,
      transform: transformCenteredOn(50000, 2000, 0.5, BASE.paneWidth, BASE.paneHeight),
    })!;

    const worldWindowWidth = view.width / view.scale;
    const worldWindowHeight = view.height / view.scale;
    expect(worldWindowWidth / worldWindowHeight).toBeCloseTo(BASE.width / BASE.height, 5);
  });

  it('shows the whole graph with no overflow when zoomed out far enough', () => {
    const nodes = [makeNode(0, 0), makeNode(400, 200), makeNode(200, 100)];
    // At zoom 1 the 3x viewport window dwarfs the tiny graph, so everything is visible.
    const view = getMinimapView({ ...BASE, nodes, transform: [0, 0, 1] })!;

    expect(view.nodes).toHaveLength(3);
    expect(view.overflow).toEqual({ left: false, right: false, top: false, bottom: false });
    // The viewport indicator sits within the rendered minimap box.
    expect(view.viewport.x).toBeGreaterThanOrEqual(0);
    expect(view.viewport.x + view.viewport.width).toBeLessThanOrEqual(view.width + 1);
  });

  it('shows only a local window and flags overflow when zoomed in on a sprawling graph', () => {
    const nodes = [
      makeNode(0, 0),
      makeNode(100000, 0),
      makeNode(100000, 2000),
      makeNode(100200, 1000),
      makeNode(200000, 0),
    ];
    // Zoomed in on the central cluster of a 200,000px-wide graph.
    const view = getMinimapView({
      ...BASE,
      nodes,
      transform: transformCenteredOn(100100, 1000, 2, BASE.paneWidth, BASE.paneHeight),
    })!;

    // Far nodes (x=0 and x=200000) fall outside the window.
    expect(view.nodes.length).toBeLessThan(nodes.length);
    // The graph extends beyond the window to both sides.
    expect(view.overflow.left).toBe(true);
    expect(view.overflow.right).toBe(true);
  });

  it('does not flag camera overflow when the viewport sits within the minimap box', () => {
    const nodes = [makeNode(0, 0), makeNode(400, 200)];
    const view = getMinimapView({ ...BASE, nodes, transform: [0, 0, 1] })!;

    expect(view.cameraOverflow).toEqual({
      left: false,
      right: false,
      top: false,
      bottom: false,
    });
  });

  it('flags camera overflow only when the camera is fully outside the minimap box', () => {
    const nodes = [makeNode(0, 0), makeNode(200000, 0), makeNode(100000, 1000)];

    // Camera centered far to the right of the graph's right edge (~200,000px): fully out of view.
    const fullyOut = getMinimapView({
      ...BASE,
      nodes,
      transform: transformCenteredOn(300000, 500, 2, BASE.paneWidth, BASE.paneHeight),
    })!;
    expect(fullyOut.cameraOverflow.right).toBe(true);
    expect(fullyOut.cameraOverflow.left).toBe(false);
  });

  it('does not flag camera overflow when the viewport is only partially outside the box', () => {
    const nodes = [makeNode(0, 0), makeNode(200000, 0), makeNode(100000, 1000)];

    // Camera centered on the graph's right edge: the viewport straddles the box edge (partial).
    const view = getMinimapView({
      ...BASE,
      nodes,
      transform: transformCenteredOn(200000, 0, 2, BASE.paneWidth, BASE.paneHeight),
    })!;

    // The viewport rect is clamped at the right edge (so it is genuinely partially clipped)...
    expect(view.viewport.x + view.viewport.width).toBeCloseTo(view.width, 5);
    // ...but since part of it is still visible, no camera-overflow indicator is flagged.
    expect(view.cameraOverflow).toEqual({
      left: false,
      right: false,
      top: false,
      bottom: false,
    });
  });

  it('maps minimap pixel points back to world coordinates', () => {
    const nodes = [makeNode(0, 0), makeNode(400, 200)];
    const view = getMinimapView({ ...BASE, nodes, transform: [0, 0, 1] })!;

    // Top-left pixel maps to the window origin.
    expect(minimapPointToWorld(view, 0, 0)).toEqual({
      x: view.windowMinX,
      y: view.windowMinY,
    });
    // A pixel one `scale` unit in maps one world unit in.
    expect(minimapPointToWorld(view, view.scale, view.scale)).toEqual({
      x: view.windowMinX + 1,
      y: view.windowMinY + 1,
    });
  });
});
