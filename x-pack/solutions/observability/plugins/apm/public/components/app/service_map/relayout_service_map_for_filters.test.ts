/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_STATUS_ACTIVE } from '@kbn/rule-data-utils';
import type { ServiceMapNode, ServiceMapEdge } from '../../../../common/service_map';
import {
  DEFAULT_SERVICE_MAP_VIEW_FILTERS,
  applyServiceMapVisibility,
  type ServiceMapViewFilters,
} from './apply_service_map_visibility';
import { applyServiceMapRelayoutForFilteredView } from './relayout_service_map_for_filters';

const mkService = (
  id: string,
  pos: { x: number; y: number },
  alertsCount: number
): ServiceMapNode => ({
  id,
  type: 'service',
  position: pos,
  data: {
    id,
    label: id,
    isService: true,
    alertsCount,
  },
});

const mkEdge = (id: string, source: string, target: string): ServiceMapEdge =>
  ({
    id,
    source,
    target,
    type: 'default',
  } as ServiceMapEdge);

describe('applyServiceMapRelayoutForFilteredView', () => {
  it('repositions remaining visible services together when the filter disconnects them', () => {
    // Linear chain: only the endpoints have active alerts; the middle is filtered out, so
    // the two visible services are not connected in the visible subgraph and were far apart
    // in the pre-filter global layout.
    const baseNodes: ServiceMapNode[] = [
      mkService('a', { x: 0, y: 0 }, 1),
      mkService('b', { x: 5000, y: 0 }, 0),
      mkService('c', { x: 10000, y: 0 }, 0),
      mkService('d', { x: 15000, y: 0 }, 1),
    ];
    const baseEdges: ServiceMapEdge[] = [
      mkEdge('e1', 'a', 'b'),
      mkEdge('e2', 'b', 'c'),
      mkEdge('e3', 'c', 'd'),
    ];
    const viewFilters: ServiceMapViewFilters = {
      ...DEFAULT_SERVICE_MAP_VIEW_FILTERS,
      alertStatusFilter: [ALERT_STATUS_ACTIVE],
    };

    const { nodes: withVisibilityOnly } = applyServiceMapVisibility(
      baseNodes,
      baseEdges,
      viewFilters
    );
    const posVis = (id: string) => withVisibilityOnly.find((n) => n.id === id)!.position;
    expect(
      Math.hypot(posVis('d').x - posVis('a').x, posVis('d').y - posVis('a').y)
    ).toBeGreaterThan(10000);

    const { nodes: compact } = applyServiceMapRelayoutForFilteredView(
      baseNodes,
      baseEdges,
      viewFilters,
      'horizontal'
    );
    const p = (id: string) => compact.find((n) => n.id === id)!.position;
    const distance = Math.hypot(p('d').x - p('a').x, p('d').y - p('a').y);
    expect(distance).toBeLessThan(2000);
  });

  it('keeps pre-filter layout positions when the filter hides nothing', () => {
    const nodes: ServiceMapNode[] = [mkService('a', { x: 17, y: 42 }, 0)];
    const edges: ServiceMapEdge[] = [];
    const { nodes: out } = applyServiceMapRelayoutForFilteredView(
      nodes,
      edges,
      DEFAULT_SERVICE_MAP_VIEW_FILTERS,
      'horizontal'
    );
    expect(out[0]!.position).toEqual({ x: 17, y: 42 });
  });
});
