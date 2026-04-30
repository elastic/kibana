/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_STATUS_ACTIVE, ALERT_STATUS_RECOVERED } from '@kbn/rule-data-utils';
import type { ServiceHealthStatus } from '../../../../common/service_health_status';
import type { ServiceMapNode, ServiceMapEdge } from '../../../../common/service_map';
import {
  applyServiceMapVisibility,
  DEFAULT_SERVICE_MAP_VIEW_FILTERS,
} from './apply_service_map_visibility';

const mkService = (
  id: string,
  overrides: Partial<{
    alertsCount: number;
    alertsByStatus: Partial<Record<string, number>>;
    sloStatus: 'healthy' | 'noSLOs';
    health: ServiceHealthStatus;
  }> = {}
): ServiceMapNode => ({
  id,
  type: 'service',
  position: { x: 0, y: 0 },
  data: {
    id,
    label: id,
    isService: true,
    ...(overrides.alertsCount !== undefined ? { alertsCount: overrides.alertsCount } : {}),
    ...(overrides.alertsByStatus !== undefined ? { alertsByStatus: overrides.alertsByStatus } : {}),
    ...(overrides.sloStatus !== undefined ? { sloStatus: overrides.sloStatus } : {}),
    ...(overrides.health !== undefined
      ? { serviceAnomalyStats: { healthStatus: overrides.health } }
      : {}),
  },
});

const mkEdge = (id: string, source: string, target: string): ServiceMapEdge =>
  ({
    id,
    source,
    target,
    type: 'default',
    style: { stroke: '#ccc', strokeWidth: 1 },
    markerEnd: {
      type: 'arrowclosed',
      width: 10,
      height: 10,
      color: '#ccc',
    },
    data: { isBidirectional: false },
  } as ServiceMapEdge);

describe('applyServiceMapVisibility', () => {
  it('hides services with no alerts in the selected alert statuses (OR across statuses)', () => {
    const nodes: ServiceMapNode[] = [
      mkService('a', { alertsCount: 2 }),
      mkService('b', { alertsCount: 0 }),
      mkService('c', {
        alertsByStatus: { [ALERT_STATUS_RECOVERED]: 1 },
        alertsCount: 0,
      }),
      {
        id: 'ext',
        type: 'dependency',
        position: { x: 0, y: 0 },
        data: { id: 'ext', label: 'redis', isService: false },
      },
    ];
    const edges: ServiceMapEdge[] = [
      mkEdge('e1', 'a', 'ext'),
      mkEdge('e2', 'ext', 'b'),
      mkEdge('e3', 'ext', 'c'),
    ];

    const { nodes: outNodesActive, edges: outEdgesActive } = applyServiceMapVisibility(
      nodes,
      edges,
      {
        ...DEFAULT_SERVICE_MAP_VIEW_FILTERS,
        alertStatusFilter: [ALERT_STATUS_ACTIVE],
      }
    );

    const byIdActive = Object.fromEntries(outNodesActive.map((n) => [n.id, n.hidden]));
    expect(byIdActive.a).toBe(false);
    expect(byIdActive.b).toBe(true);
    expect(byIdActive.c).toBe(true);
    expect(byIdActive.ext).toBe(false);

    const edgeHiddenActive = Object.fromEntries(outEdgesActive.map((e) => [e.id, e.hidden]));
    expect(edgeHiddenActive.e1).toBe(false);
    expect(edgeHiddenActive.e2).toBe(true);
    expect(edgeHiddenActive.e3).toBe(true);

    const { nodes: outNodesRecovered } = applyServiceMapVisibility(nodes, edges, {
      ...DEFAULT_SERVICE_MAP_VIEW_FILTERS,
      alertStatusFilter: [ALERT_STATUS_RECOVERED],
    });
    const byIdRecovered = Object.fromEntries(outNodesRecovered.map((n) => [n.id, n.hidden]));
    expect(byIdRecovered.c).toBe(false);
    expect(byIdRecovered.b).toBe(true);
  });

  it('shows all nodes when filters are default', () => {
    const nodes: ServiceMapNode[] = [mkService('a'), mkService('b')];
    const edges: ServiceMapEdge[] = [mkEdge('e1', 'a', 'b')];
    const { nodes: outNodes, edges: outEdges } = applyServiceMapVisibility(
      nodes,
      edges,
      DEFAULT_SERVICE_MAP_VIEW_FILTERS
    );
    expect(outNodes.every((n) => !n.hidden)).toBe(true);
    expect(outEdges.every((e) => !e.hidden)).toBe(true);
  });

  it('treats sloStatus noSLOs like noData for SLO filter', () => {
    const nodes: ServiceMapNode[] = [
      mkService('a', { sloStatus: 'noSLOs' }),
      mkService('b', { sloStatus: 'healthy' }),
    ];
    const edges: ServiceMapEdge[] = [mkEdge('e1', 'a', 'b')];
    const { nodes: onlyNoData } = applyServiceMapVisibility(nodes, edges, {
      ...DEFAULT_SERVICE_MAP_VIEW_FILTERS,
      sloStatusFilter: ['noData'],
    });
    const byId = Object.fromEntries(onlyNoData.map((n) => [n.id, n.hidden]));
    expect(byId.a).toBe(false);
    expect(byId.b).toBe(true);

    const { nodes: onlyHealthy } = applyServiceMapVisibility(nodes, edges, {
      ...DEFAULT_SERVICE_MAP_VIEW_FILTERS,
      sloStatusFilter: ['healthy'],
    });
    const byIdH = Object.fromEntries(onlyHealthy.map((n) => [n.id, n.hidden]));
    expect(byIdH.a).toBe(true);
    expect(byIdH.b).toBe(false);
  });

  it('pulls a multi-hop dependency chain into view in one pass', () => {
    const nodes: ServiceMapNode[] = [
      mkService('svc', { alertsCount: 1 }),
      {
        id: 'd1',
        type: 'dependency',
        position: { x: 0, y: 0 },
        data: { id: 'd1', label: 'd1', isService: false },
      },
      {
        id: 'd2',
        type: 'dependency',
        position: { x: 0, y: 0 },
        data: { id: 'd2', label: 'd2', isService: false },
      },
    ];
    const edges: ServiceMapEdge[] = [mkEdge('e1', 'svc', 'd1'), mkEdge('e2', 'd1', 'd2')];
    const { nodes: out } = applyServiceMapVisibility(
      nodes,
      edges,
      DEFAULT_SERVICE_MAP_VIEW_FILTERS
    );
    const hidden = Object.fromEntries(out.map((n) => [n.id, n.hidden]));
    expect(hidden.svc).toBe(false);
    expect(hidden.d1).toBe(false);
    expect(hidden.d2).toBe(false);
  });
});
