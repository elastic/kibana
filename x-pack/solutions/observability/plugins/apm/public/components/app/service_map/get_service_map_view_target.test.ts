/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Rect } from '@xyflow/react';
import type { ServiceMapNode } from '../../../../common/service_map';
import { getServiceMapViewTarget } from './get_service_map_view_target';

const makeNode = (x: number, y: number, overrides: Partial<ServiceMapNode> = {}): ServiceMapNode =>
  ({
    id: `${x}-${y}`,
    position: { x, y },
    data: {},
    ...overrides,
  } as ServiceMapNode);

const VIEWPORT = { viewportWidth: 1200, viewportHeight: 600 };
const EMPTY_BOUNDS: Rect = { x: 0, y: 0, width: 0, height: 0 };

describe('getServiceMapViewTarget', () => {
  it('fits when there are no visible nodes', () => {
    expect(getServiceMapViewTarget({ ...VIEWPORT, nodes: [], bounds: EMPTY_BOUNDS })).toEqual({
      kind: 'fit',
    });
  });

  it('fits when the pane has not been measured yet', () => {
    expect(
      getServiceMapViewTarget({
        viewportWidth: 0,
        viewportHeight: 0,
        nodes: [makeNode(0, 0)],
        bounds: { x: 0, y: 0, width: 200, height: 80 },
      })
    ).toEqual({ kind: 'fit' });
  });

  it('fits a small graph that comfortably fits the viewport', () => {
    const nodes = [makeNode(0, 0), makeNode(300, 0), makeNode(0, 200), makeNode(300, 200)];
    const bounds: Rect = { x: 0, y: 0, width: 500, height: 280 };
    expect(getServiceMapViewTarget({ ...VIEWPORT, nodes, bounds })).toEqual({ kind: 'fit' });
  });

  it('centers on the median node for a large sprawling graph', () => {
    const nodes = [
      makeNode(0, 0),
      makeNode(100, 0),
      makeNode(200, 0),
      makeNode(100, 100),
      makeNode(50_000, 30_000),
    ];
    const bounds: Rect = { x: 0, y: 0, width: 50_200, height: 30_080 };

    const target = getServiceMapViewTarget({ ...VIEWPORT, nodes, bounds });

    expect(target.kind).toBe('center');
    if (target.kind === 'center') {
      expect(target.x).toBe(100 + 200 / 2);
      expect(target.y).toBe(0 + 80 / 2);
    }
  });
});
