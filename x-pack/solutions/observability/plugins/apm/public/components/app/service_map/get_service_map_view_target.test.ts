/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceMapNode } from '../../../../common/service_map';
import { getServiceMapViewTarget } from './get_service_map_view_target';
import { LARGE_MAP_OVERVIEW_ZOOM } from './constants';

const makeNode = (x: number, y: number, overrides: Partial<ServiceMapNode> = {}): ServiceMapNode =>
  ({
    id: `${x}-${y}`,
    position: { x, y },
    data: {},
    ...overrides,
  } as ServiceMapNode);

const VIEWPORT = { viewportWidth: 1200, viewportHeight: 600 };

describe('getServiceMapViewTarget', () => {
  it('fits when there are no visible nodes', () => {
    expect(getServiceMapViewTarget({ ...VIEWPORT, nodes: [] })).toEqual({ kind: 'fit' });
    expect(
      getServiceMapViewTarget({ ...VIEWPORT, nodes: [makeNode(0, 0, { hidden: true })] })
    ).toEqual({ kind: 'fit' });
  });

  it('fits when the pane has not been measured yet', () => {
    expect(
      getServiceMapViewTarget({ viewportWidth: 0, viewportHeight: 0, nodes: [makeNode(0, 0)] })
    ).toEqual({ kind: 'fit' });
  });

  it('fits a small graph that comfortably fits the viewport', () => {
    const nodes = [makeNode(0, 0), makeNode(300, 0), makeNode(0, 200), makeNode(300, 200)];
    expect(getServiceMapViewTarget({ ...VIEWPORT, nodes })).toEqual({ kind: 'fit' });
  });

  it('centers on the median node for a large sprawling graph', () => {
    const nodes = [
      makeNode(0, 0),
      makeNode(100, 0),
      makeNode(200, 0),
      makeNode(100, 100),
      makeNode(50_000, 30_000),
    ];

    const target = getServiceMapViewTarget({ ...VIEWPORT, nodes });

    expect(target.kind).toBe('center');
    if (target.kind === 'center') {
      expect(target.zoom).toBe(LARGE_MAP_OVERVIEW_ZOOM);
      expect(target.x).toBe(100 + 200 / 2);
      expect(target.y).toBe(0 + 80 / 2);
    }
  });
});
