/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceMapNode, ServiceMapEdge } from '../../../../common/service_map';
import { getServiceIdsWithHiddenConnections } from './filter_to_visible_subgraph';

function node(
  id: string,
  type: 'service' | 'dependency' | 'groupedResources' = 'service'
): ServiceMapNode {
  return {
    id,
    type,
    data: {
      id,
      label: id,
      ...(type === 'service' ? { isService: true as const } : { isService: false }),
    },
    position: { x: 0, y: 0 },
  };
}

function edge(source: string, target: string): ServiceMapEdge {
  return {
    id: `${source}~${target}`,
    source,
    target,
    type: 'default',
    data: { isBidirectional: false },
    style: { stroke: '', strokeWidth: 1 },
    markerEnd: { type: 'arrow', width: 1, height: 1, color: '' },
  };
}

describe('getServiceIdsWithHiddenConnections', () => {
  it('returns empty set when all nodes are displayed (no filter)', () => {
    const nodes = [node('A'), node('B'), node('C'), node('D')];
    const edges = [edge('A', 'B'), edge('B', 'C'), edge('A', 'D'), edge('D', 'E')];
    const displayNodes = nodes; // full graph
    const result = getServiceIdsWithHiddenConnections(displayNodes, edges);
    // E is not in displayNodes; D is a service in display and has edge D->E, so D has hidden connection
    expect(result.size).toBe(1);
    expect(result.has('D')).toBe(true);
  });

  it('returns empty set when displayed graph equals full graph (all connections visible)', () => {
    const nodes = [node('A'), node('B'), node('C')];
    const edges = [edge('A', 'B'), edge('B', 'C')];
    const result = getServiceIdsWithHiddenConnections(nodes, edges);
    expect(result.size).toBe(0);
  });

  it('returns service D when filtered view shows A->B->C and A->D but D has other connections not visible', () => {
    const fullNodes = [node('A'), node('B'), node('C'), node('D'), node('E'), node('F')];
    const fullEdges = [
      edge('A', 'B'),
      edge('B', 'C'),
      edge('A', 'D'),
      edge('D', 'E'),
      edge('D', 'F'),
    ];
    const displayNodes = fullNodes.filter((n) => ['A', 'B', 'C', 'D'].includes(n.id));
    const result = getServiceIdsWithHiddenConnections(displayNodes, fullEdges);
    expect(result.has('D')).toBe(true);
    expect(result.has('C')).toBe(false);
    expect(result.size).toBe(1);
  });

  it('ignores dependency nodes (only service nodes can have the + icon)', () => {
    const fullNodes = [node('A'), node('B'), node('dep1', 'dependency')];
    const fullEdges = [edge('A', 'B'), edge('A', 'dep1')];
    const displayNodes = fullNodes.filter((n) => n.id !== 'dep1');
    const result = getServiceIdsWithHiddenConnections(displayNodes, fullEdges);
    expect(result.has('A')).toBe(true);
    expect(result.size).toBe(1);
  });
});
