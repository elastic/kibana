/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceMapEdge } from '../../../../../common/service_map';
import { mkEdge } from '../test_helpers';
import { buildUndirectedAdjacency, computeHopDepthVisibilityWithCap } from './hop_depth_visibility';

const edges: ServiceMapEdge[] = [
  mkEdge('e-ab', 'focal', 'dependency-b'),
  mkEdge('e-ac', 'focal', 'dependency-c'),
  mkEdge('e-bd', 'dependency-b', 'deep-d'),
  mkEdge('e-ce', 'dependency-c', 'dep-redis'),
];

const nodeIds = new Set(['focal', 'dependency-b', 'dependency-c', 'deep-d', 'dep-redis']);

describe('buildUndirectedAdjacency', () => {
  it('links both endpoints for each edge', () => {
    const adjacency = buildUndirectedAdjacency(edges);

    expect(adjacency.get('focal')).toEqual(new Set(['dependency-b', 'dependency-c']));
    expect(adjacency.get('dependency-b')).toEqual(new Set(['focal', 'deep-d']));
    expect(adjacency.get('dep-redis')).toEqual(new Set(['dependency-c']));
  });
});

describe('computeHopDepthVisibilityWithCap', () => {
  it('returns only the focal node within baseMaxHops when dependencies are beyond the hop limit', () => {
    const result = computeHopDepthVisibilityWithCap({
      focalNodeId: 'focal',
      maxHops: 0,
      maxVisibleNodes: 8,
      nodeIds,
      edges,
    });

    expect(result.visibleNodeIds).toEqual(new Set(['focal']));
    expect(result.totalHiddenCount).toBe(4);
    expect(result.hiddenDependencyCountByNodeId.get('focal')).toBe(2);
  });

  it('includes dependencies within maxHops but excludes deeper nodes', () => {
    const result = computeHopDepthVisibilityWithCap({
      focalNodeId: 'focal',
      maxHops: 1,
      maxVisibleNodes: 8,
      nodeIds,
      edges,
    });

    expect(result.visibleNodeIds).toEqual(new Set(['focal', 'dependency-b', 'dependency-c']));
    expect(result.totalHiddenCount).toBe(2);
    expect(result.hiddenDependencyCountByNodeId.get('dependency-b')).toBe(1);
    expect(result.hiddenDependencyCountByNodeId.get('dependency-c')).toBe(1);
  });

  it('stops adding nodes once maxVisibleNodes is reached', () => {
    const result = computeHopDepthVisibilityWithCap({
      focalNodeId: 'focal',
      maxHops: 3,
      maxVisibleNodes: 2,
      nodeIds,
      edges,
    });

    expect(result.visibleNodeIds.size).toBe(2);
    expect(result.visibleNodeIds.has('focal')).toBe(true);
    expect(result.totalHiddenCount).toBe(3);
  });

  it('returns empty visibility when maxVisibleNodes is zero', () => {
    const result = computeHopDepthVisibilityWithCap({
      focalNodeId: 'focal',
      maxHops: 1,
      maxVisibleNodes: 0,
      nodeIds,
      edges,
    });

    expect(result.visibleNodeIds.size).toBe(0);
    expect(result.totalHiddenCount).toBe(5);
  });

  it('returns empty visibility when the focal node is not in the graph', () => {
    const result = computeHopDepthVisibilityWithCap({
      focalNodeId: 'missing',
      maxHops: 1,
      maxVisibleNodes: 8,
      nodeIds,
      edges,
    });

    expect(result.visibleNodeIds.size).toBe(0);
    expect(result.totalHiddenCount).toBe(5);
  });
});
