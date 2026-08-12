/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceMapEdge, ServiceMapNode } from '../../../../../common/service_map';
import { mkEdge } from '../test_helpers';
import { filterServiceMapWithExpansions } from './contextual_map_visibility';

const mkService = (id: string, alertsCount?: number): ServiceMapNode => ({
  id,
  type: 'service',
  position: { x: 0, y: 0 },
  data: {
    id,
    label: id,
    isService: true,
    ...(alertsCount !== undefined ? { alertsCount } : {}),
  },
});

const mkDependency = (id: string): ServiceMapNode => ({
  id,
  type: 'dependency',
  position: { x: 0, y: 0 },
  data: { id, label: id, isService: false },
});

describe('filterServiceMapWithExpansions', () => {
  const nodes: ServiceMapNode[] = [
    mkService('focal'),
    mkService('dependency-b'),
    mkService('hidden-service', 2),
    mkDependency('hidden-redis'),
  ];

  const edges: ServiceMapEdge[] = [
    mkEdge('e-fb', 'focal', 'dependency-b'),
    mkEdge('e-bh', 'dependency-b', 'hidden-service'),
    mkEdge('e-br', 'dependency-b', 'hidden-redis'),
  ];

  it('applies hop and visible-node limits before expansions', () => {
    const {
      nodes: visibleNodes,
      edges: visibleEdges,
      visibility,
    } = filterServiceMapWithExpansions({
      focalNodeId: 'focal',
      baseMaxHops: 1,
      maxVisibleNodes: 8,
      expandedNodeIds: new Set(),
      nodes,
      edges,
    });

    expect(visibleNodes.map((node) => node.id).sort()).toEqual(['dependency-b', 'focal']);
    expect(visibleEdges.map((edge) => edge.id)).toEqual(['e-fb']);
    expect(visibility.totalHiddenCount).toBe(2);
    expect(visibility.hiddenDependencyCountByNodeId.get('dependency-b')).toBe(2);
    expect(visibility.hiddenAttentionCountByNodeId.get('dependency-b')).toBe(1);
  });

  it('reveals hidden dependencies when a visible node is expanded', () => {
    const { nodes: visibleNodes, visibility } = filterServiceMapWithExpansions({
      focalNodeId: 'focal',
      baseMaxHops: 1,
      maxVisibleNodes: 8,
      expandedNodeIds: new Set(['dependency-b']),
      nodes,
      edges,
    });

    expect(visibleNodes.map((node) => node.id).sort()).toEqual([
      'dependency-b',
      'focal',
      'hidden-redis',
      'hidden-service',
    ]);
    expect(visibility.totalHiddenCount).toBe(0);
    expect(visibility.hiddenDependencyCountByNodeId.get('dependency-b')).toBeUndefined();
  });

  it('counts hidden dependencies rather than only hidden service nodes in the badge', () => {
    const { visibility } = filterServiceMapWithExpansions({
      focalNodeId: 'focal',
      baseMaxHops: 1,
      maxVisibleNodes: 8,
      expandedNodeIds: new Set(),
      nodes,
      edges,
    });

    expect(visibility.hiddenDependencyCountByNodeId.get('dependency-b')).toBe(2);
    expect(visibility.hiddenAttentionCountByNodeId.get('dependency-b')).toBe(1);
  });

  it('ignores expansions on nodes that are not currently visible', () => {
    const { nodes: visibleNodes } = filterServiceMapWithExpansions({
      focalNodeId: 'focal',
      baseMaxHops: 0,
      maxVisibleNodes: 8,
      expandedNodeIds: new Set(['dependency-b']),
      nodes,
      edges,
    });

    expect(visibleNodes.map((node) => node.id)).toEqual(['focal']);
  });
});
