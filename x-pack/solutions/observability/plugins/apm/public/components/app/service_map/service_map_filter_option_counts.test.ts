/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceMapNode, ServiceMapEdge } from '../../../../common/service_map';
import { computeServiceMapFilterOptionCounts } from './service_map_filter_option_counts';
import { mkEdge, mkIntraGroupEdge } from './test_helpers';

function mkService(id: string, sloStatus?: 'healthy' | 'violated' | 'noSLOs'): ServiceMapNode {
  return {
    id,
    type: 'service',
    position: { x: 0, y: 0 },
    data: {
      id,
      label: id,
      isService: true,
      ...(sloStatus !== undefined ? { sloStatus } : {}),
    },
  };
}

describe('computeServiceMapFilterOptionCounts', () => {
  it('counts sloStatus noSLOs in the noData bucket', () => {
    const nodes: ServiceMapNode[] = [
      mkService('a', 'noSLOs'),
      mkService('b', 'healthy'),
      mkService('c'),
    ];
    const { slo } = computeServiceMapFilterOptionCounts(nodes, []);
    expect(slo.noData).toBe(2);
    expect(slo.healthy).toBe(1);
    expect(slo.violated).toBe(0);
    expect(slo.degrading).toBe(0);
  });

  it('counts orphaned and connected services from edges', () => {
    const nodes: ServiceMapNode[] = [mkService('a'), mkService('b'), mkService('c')];
    const edges: ServiceMapEdge[] = [mkEdge('e1', 'a', 'b')];

    const { connection } = computeServiceMapFilterOptionCounts(nodes, edges);
    expect(connection.connected).toBe(2);
    expect(connection.orphaned).toBe(1);
  });

  it('counts all as orphaned when there are no edges', () => {
    const nodes: ServiceMapNode[] = [mkService('a'), mkService('b')];

    const { connection } = computeServiceMapFilterOptionCounts(nodes, []);
    expect(connection.connected).toBe(0);
    expect(connection.orphaned).toBe(2);
  });

  it('counts dependency (diamond) nodes in connection counts', () => {
    const nodes: ServiceMapNode[] = [
      mkService('svc'),
      {
        id: 'dep',
        type: 'dependency',
        position: { x: 0, y: 0 },
        data: { id: 'dep', label: 'redis', isService: false },
      },
    ];
    const edges: ServiceMapEdge[] = [mkEdge('e1', 'svc', 'dep')];

    const { connection } = computeServiceMapFilterOptionCounts(nodes, edges);
    expect(connection.connected).toBe(2);
    expect(connection.orphaned).toBe(0);
  });

  it('counts closed service groups in alert and SLO option tallies', () => {
    const nodes: ServiceMapNode[] = [
      mkService('alone'),
      {
        id: 'namePrefix:opbeans',
        type: 'serviceGroup',
        position: { x: 0, y: 0 },
        data: {
          id: 'namePrefix:opbeans',
          label: 'opbeans',
          isService: false,
          isServiceGroup: true,
          groupKind: 'attribute',
          memberServiceIds: ['opbeans-java', 'opbeans-node'],
          memberCount: 2,
          alertsByStatus: { active: 2 },
          sloStatus: 'violated',
        },
      },
    ];

    const { alerts, slo, totalServiceNodes } = computeServiceMapFilterOptionCounts(nodes, []);
    expect(alerts.active).toBe(1);
    expect(slo.violated).toBe(1);
    expect(totalServiceNodes).toBe(2);
  });

  describe('with an open group', () => {
    const box: ServiceMapNode = {
      id: 'namePrefix:opbeans',
      type: 'serviceGroupBox',
      position: { x: 0, y: 0 },
      data: {
        id: 'namePrefix:opbeans',
        label: 'opbeans',
        isService: false,
        isServiceGroupBox: true,
        groupKind: 'attribute',
        memberServiceIds: ['opbeans-java', 'opbeans-node'],
        memberCount: 2,
      },
    };
    const member = (id: string, sloStatus?: 'violated'): ServiceMapNode => ({
      ...mkService(id, sloStatus),
      parentId: box.id,
      extent: 'parent',
    });

    it('counts the members, not the box', () => {
      const nodes = [box, member('opbeans-java', 'violated'), member('opbeans-node')];
      const edges: ServiceMapEdge[] = [mkEdge('e1', 'opbeans-java', 'opbeans-node')];

      const { slo, totalServiceNodes, connection } = computeServiceMapFilterOptionCounts(
        nodes,
        edges
      );
      expect(totalServiceNodes).toBe(2);
      expect(slo.violated).toBe(1);
      expect(slo.noData).toBe(1);
      expect(connection).toEqual({ connected: 2, orphaned: 0 });
    });

    it('does not count a call between two members of the group as a connection', () => {
      const nodes = [box, member('opbeans-java'), member('opbeans-node')];
      const edges = [mkIntraGroupEdge('e1', 'opbeans-java', 'opbeans-node')];

      const { connection } = computeServiceMapFilterOptionCounts(nodes, edges);

      expect(connection).toEqual({ connected: 0, orphaned: 2 });
    });

    it('counts a member with a call out of the group as connected', () => {
      const nodes = [box, member('opbeans-java'), member('opbeans-node'), mkService('frontend')];
      const edges = [
        mkIntraGroupEdge('e1', 'opbeans-java', 'opbeans-node'),
        mkEdge('e2', 'frontend', 'opbeans-java'),
      ];

      const { connection } = computeServiceMapFilterOptionCounts(nodes, edges);

      expect(connection).toEqual({ connected: 2, orphaned: 1 });
    });

    it('does not count the box as an orphaned node', () => {
      const nodes = [box, member('opbeans-java'), member('opbeans-node')];

      const { connection } = computeServiceMapFilterOptionCounts(nodes, []);
      expect(connection).toEqual({ connected: 0, orphaned: 2 });
    });
  });
});
