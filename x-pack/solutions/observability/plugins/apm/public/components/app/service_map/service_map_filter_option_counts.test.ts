/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceMapNode, ServiceMapEdge } from '../../../../common/service_map';
import { computeServiceMapFilterOptionCounts } from './service_map_filter_option_counts';
import { mkEdge } from './test_helpers';

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
});
