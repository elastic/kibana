/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_STATUS_ACTIVE, ALERT_STATUS_RECOVERED } from '@kbn/rule-data-utils';
import { ML_ANOMALY_SEVERITY } from '@kbn/ml-anomaly-utils/anomaly_severity';
import type { ServiceMapNode, ServiceMapEdge } from '../../../../common/service_map';
import {
  applyServiceMapVisibility,
  DEFAULT_SERVICE_MAP_VIEW_FILTERS,
} from './apply_service_map_visibility';
import { mkEdge } from './test_helpers';

const mkService = (
  id: string,
  overrides: Partial<{
    alertsCount: number;
    alertsByStatus: Partial<Record<string, number>>;
    sloStatus: 'healthy' | 'noSLOs';
    anomalyScore: number;
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
    ...(overrides.anomalyScore !== undefined
      ? {
          serviceAnomalyStats: {
            anomalyScore: overrides.anomalyScore,
          },
        }
      : {}),
  },
});

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

  it('filters services by ML anomaly severity band (OR across selected severities)', () => {
    const nodes: ServiceMapNode[] = [
      mkService('crit', { anomalyScore: 90 }),
      mkService('major', { anomalyScore: 55 }),
      mkService('noMl', {}),
    ];
    const edges: ServiceMapEdge[] = [];

    const { nodes: onlyCritical } = applyServiceMapVisibility(nodes, edges, {
      ...DEFAULT_SERVICE_MAP_VIEW_FILTERS,
      anomalySeverityFilter: [ML_ANOMALY_SEVERITY.CRITICAL],
    });
    const hiddenCrit = Object.fromEntries(onlyCritical.map((n) => [n.id, n.hidden]));
    expect(hiddenCrit.crit).toBe(false);
    expect(hiddenCrit.major).toBe(true);
    expect(hiddenCrit.noMl).toBe(true);

    const { nodes: criticalOrMajor } = applyServiceMapVisibility(nodes, edges, {
      ...DEFAULT_SERVICE_MAP_VIEW_FILTERS,
      anomalySeverityFilter: [ML_ANOMALY_SEVERITY.CRITICAL, ML_ANOMALY_SEVERITY.MAJOR],
    });
    const hiddenBoth = Object.fromEntries(criticalOrMajor.map((n) => [n.id, n.hidden]));
    expect(hiddenBoth.crit).toBe(false);
    expect(hiddenBoth.major).toBe(false);
    expect(hiddenBoth.noMl).toBe(true);
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

  describe('connectionFilter', () => {
    const nodes: ServiceMapNode[] = [
      mkService('connected1'),
      mkService('connected2'),
      mkService('orphan'),
    ];
    const edges: ServiceMapEdge[] = [mkEdge('e1', 'connected1', 'connected2')];

    it('orphaned filter hides connected services and shows orphans', () => {
      const { nodes: out } = applyServiceMapVisibility(nodes, edges, {
        ...DEFAULT_SERVICE_MAP_VIEW_FILTERS,
        connectionFilter: ['orphaned'],
      });
      const hidden = Object.fromEntries(out.map((n) => [n.id, n.hidden]));
      expect(hidden.connected1).toBe(true);
      expect(hidden.connected2).toBe(true);
      expect(hidden.orphan).toBe(false);
    });

    it('connected filter hides orphans and shows connected services', () => {
      const { nodes: out } = applyServiceMapVisibility(nodes, edges, {
        ...DEFAULT_SERVICE_MAP_VIEW_FILTERS,
        connectionFilter: ['connected'],
      });
      const hidden = Object.fromEntries(out.map((n) => [n.id, n.hidden]));
      expect(hidden.connected1).toBe(false);
      expect(hidden.connected2).toBe(false);
      expect(hidden.orphan).toBe(true);
    });

    it('empty array (default) shows all services', () => {
      const { nodes: out } = applyServiceMapVisibility(nodes, edges, {
        ...DEFAULT_SERVICE_MAP_VIEW_FILTERS,
        connectionFilter: [],
      });
      expect(out.every((n) => !n.hidden)).toBe(true);
    });

    it('works in combination with other filters (AND semantics)', () => {
      const nodesWithAlerts: ServiceMapNode[] = [
        mkService('connectedWithAlert', { alertsCount: 1 }),
        mkService('connectedNoAlert'),
        mkService('orphanWithAlert', { alertsCount: 1 }),
        mkService('orphanNoAlert'),
      ];
      const edgesForCombo: ServiceMapEdge[] = [
        mkEdge('e1', 'connectedWithAlert', 'connectedNoAlert'),
      ];

      const { nodes: out } = applyServiceMapVisibility(nodesWithAlerts, edgesForCombo, {
        ...DEFAULT_SERVICE_MAP_VIEW_FILTERS,
        connectionFilter: ['connected'],
        alertStatusFilter: ['active'],
      });
      const hidden = Object.fromEntries(out.map((n) => [n.id, n.hidden]));
      expect(hidden.connectedWithAlert).toBe(false);
      expect(hidden.connectedNoAlert).toBe(true);
      expect(hidden.orphanWithAlert).toBe(true);
      expect(hidden.orphanNoAlert).toBe(true);
    });

    it('selecting both orphaned and connected shows all services (OR semantics)', () => {
      const { nodes: out } = applyServiceMapVisibility(nodes, edges, {
        ...DEFAULT_SERVICE_MAP_VIEW_FILTERS,
        connectionFilter: ['orphaned', 'connected'],
      });
      expect(out.every((n) => !n.hidden)).toBe(true);
    });

    it('counts a connection to a dependency as connected', () => {
      const nodesWithDep: ServiceMapNode[] = [
        mkService('svc'),
        {
          id: 'dep',
          type: 'dependency',
          position: { x: 0, y: 0 },
          data: { id: 'dep', label: 'redis', isService: false },
        },
        mkService('orphan'),
      ];
      const edgesWithDep: ServiceMapEdge[] = [mkEdge('e1', 'svc', 'dep')];

      const { nodes: out } = applyServiceMapVisibility(nodesWithDep, edgesWithDep, {
        ...DEFAULT_SERVICE_MAP_VIEW_FILTERS,
        connectionFilter: ['orphaned'],
      });
      const hidden = Object.fromEntries(out.map((n) => [n.id, n.hidden]));
      expect(hidden.svc).toBe(true);
      expect(hidden.orphan).toBe(false);
    });
  });
});
