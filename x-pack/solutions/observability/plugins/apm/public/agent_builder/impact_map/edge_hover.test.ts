/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Edge, Node } from '@xyflow/react';
import {
  applyEdgeHoverHighlight,
  EDGE_DIMMED_CLASS,
  EDGE_HOVERED_CLASS,
} from './edge_hover';

const nodes: Node[] = [
  { id: 'a', position: { x: 0, y: 0 }, data: {}, className: 'clickable' },
  { id: 'b', position: { x: 1, y: 0 }, data: {}, className: 'clickable' },
  { id: 'c', position: { x: 2, y: 0 }, data: {}, className: 'clickable' },
];

const edges: Edge[] = [
  {
    id: 'a->b',
    source: 'a',
    target: 'b',
    className: 'clickable',
    style: { stroke: 'red', strokeWidth: 3 },
    data: {},
  },
  {
    id: 'a->c',
    source: 'a',
    target: 'c',
    className: 'clickable',
    style: { stroke: 'red', strokeWidth: 3 },
    data: {},
  },
];

describe('applyEdgeHoverHighlight', () => {
  it('leaves the graph alone when nothing is hovered', () => {
    expect(applyEdgeHoverHighlight(nodes, edges, null)).toEqual({
      nodes,
      edges,
      endpointIds: new Set(),
    });
  });

  it('brightens the hovered edge and reports its ends, without rewriting nodes', () => {
    const { nodes: nextNodes, edges: nextEdges, endpointIds } = applyEdgeHoverHighlight(
      nodes,
      edges,
      'a->b'
    );

    expect(nextNodes).toBe(nodes);
    expect(endpointIds).toEqual(new Set(['a', 'b']));
    expect(nextEdges.find(({ id }) => id === 'a->b')).toMatchObject({
      className: expect.stringContaining(EDGE_HOVERED_CLASS),
      zIndex: 1000,
      style: { strokeWidth: 3, opacity: 1 },
      data: { hover: 'highlighted' },
    });
    expect(nextEdges.find(({ id }) => id === 'a->c')).toMatchObject({
      className: expect.stringContaining(EDGE_DIMMED_CLASS),
      style: { opacity: 0.15 },
      data: { hover: 'dimmed' },
    });
  });
});
