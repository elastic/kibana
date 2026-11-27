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
import { applyServiceMapLayout } from '../../shared/service_map/layout';
import { NODE_HEIGHT, NODE_WIDTH } from './constants';
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

  describe('with an open group', () => {
    const mkBox = (id: string): ServiceMapNode => ({
      id,
      type: 'serviceGroupBox',
      position: { x: 0, y: 0 },
      data: {
        id,
        label: id,
        isService: false,
        isServiceGroupBox: true,
        groupKind: 'attribute',
        memberServiceIds: [],
        memberCount: 0,
      },
    });
    const mkMember = (id: string, boxId: string, alertsCount: number): ServiceMapNode => ({
      ...mkService(id, { x: 0, y: 0 }, alertsCount),
      parentId: boxId,
      extent: 'parent',
    });

    // Laid out the way the map does before any filter is applied.
    const layOut = (nodes: ServiceMapNode[], edges: ServiceMapEdge[]) =>
      applyServiceMapLayout(nodes, edges, { rankdir: 'LR' });

    const alertFilters: ServiceMapViewFilters = {
      ...DEFAULT_SERVICE_MAP_VIEW_FILTERS,
      alertStatusFilter: [ALERT_STATUS_ACTIVE],
    };

    const getNode = (nodes: ServiceMapNode[], id: string) => nodes.find((n) => n.id === id)!;

    it('shrinks the box to the members that pass the filter and keeps them inside it', () => {
      const edges = [mkEdge('e1', 'm1', 'm2'), mkEdge('e2', 'm2', 'm3'), mkEdge('e3', 'x', 'm1')];
      const nodes = layOut(
        [
          mkBox('g'),
          mkMember('m1', 'g', 1),
          mkMember('m2', 'g', 0),
          mkMember('m3', 'g', 1),
          mkService('x', { x: 0, y: 0 }, 1),
        ],
        edges
      );

      const { nodes: filtered } = applyServiceMapRelayoutForFilteredView(
        nodes,
        edges,
        alertFilters,
        'horizontal'
      );

      const box = getNode(filtered, 'g');
      expect(box.hidden).toBe(false);
      expect(getNode(filtered, 'm2').hidden).toBe(true);
      expect(box.width).toBeLessThan(getNode(nodes, 'g').width!);

      for (const id of ['m1', 'm3']) {
        const member = getNode(filtered, id);
        expect(member.hidden).toBe(false);
        expect(member.parentId).toBe('g');
        expect(member.position.x).toBeGreaterThanOrEqual(0);
        expect(member.position.y).toBeGreaterThanOrEqual(0);
        expect(member.position.x + NODE_WIDTH).toBeLessThanOrEqual(box.width!);
        expect(member.position.y + NODE_HEIGHT).toBeLessThanOrEqual(box.height!);
      }
    });

    it('keeps the box while one member passes the filter', () => {
      const edges = [mkEdge('e1', 'm1', 'm2')];
      const nodes = layOut([mkBox('g'), mkMember('m1', 'g', 0), mkMember('m2', 'g', 1)], edges);

      const { nodes: filtered } = applyServiceMapRelayoutForFilteredView(
        nodes,
        edges,
        alertFilters,
        'horizontal'
      );

      expect(getNode(filtered, 'g').hidden).toBe(false);
      expect(getNode(filtered, 'm1').hidden).toBe(true);
      expect(getNode(filtered, 'm2').hidden).toBe(false);
    });

    it('hides the box when no member passes the filter, and lays out what is left', () => {
      const edges = [mkEdge('e1', 'm1', 'm2'), mkEdge('e2', 'x', 'y')];
      const nodes = layOut(
        [
          mkBox('g'),
          mkMember('m1', 'g', 0),
          mkMember('m2', 'g', 0),
          mkService('x', { x: 0, y: 0 }, 1),
          mkService('y', { x: 0, y: 0 }, 1),
        ],
        edges
      );

      const { nodes: filtered, edges: filteredEdges } = applyServiceMapRelayoutForFilteredView(
        nodes,
        edges,
        alertFilters,
        'horizontal'
      );

      expect(getNode(filtered, 'g').hidden).toBe(true);
      expect(getNode(filtered, 'm1').hidden).toBe(true);
      expect(getNode(filtered, 'm2').hidden).toBe(true);
      expect(getNode(filtered, 'x').hidden).toBe(false);
      expect(getNode(filtered, 'y').hidden).toBe(false);
      expect(filteredEdges.find((e) => e.id === 'e1')!.hidden).toBe(true);
      expect(filteredEdges.find((e) => e.id === 'e2')!.hidden).toBe(false);
    });

    it('keeps the box before its members', () => {
      const edges = [mkEdge('e1', 'm1', 'm2')];
      const nodes = layOut(
        [
          mkBox('g'),
          mkMember('m1', 'g', 1),
          mkMember('m2', 'g', 0),
          mkService('x', { x: 0, y: 0 }, 1),
        ],
        edges
      );

      const { nodes: filtered } = applyServiceMapRelayoutForFilteredView(
        nodes,
        edges,
        alertFilters,
        'horizontal'
      );

      const ids = filtered.map(({ id }) => id);
      expect(ids.indexOf('g')).toBeLessThan(ids.indexOf('m1'));
    });
  });
});
