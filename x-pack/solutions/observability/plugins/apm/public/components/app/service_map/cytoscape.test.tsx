/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type cytoscape from 'cytoscape';
import { filterValidElements } from './cytoscape';

const node = (id: string): cytoscape.ElementDefinition => ({
  data: { id },
});

const edge = (id: string, source: string, target: string): cytoscape.ElementDefinition => ({
  data: { id, source, target },
});

describe('filterValidElements', () => {
  it('returns all elements when every edge references existing nodes', () => {
    const elements = [node('a'), node('b'), edge('a->b', 'a', 'b')];

    expect(filterValidElements(elements)).toEqual(elements);
  });

  it('removes edges whose source node does not exist', () => {
    const elements = [node('a'), edge('x->a', 'x', 'a')];

    expect(filterValidElements(elements)).toEqual([node('a')]);
  });

  it('removes edges whose target node does not exist', () => {
    const elements = [node('a'), edge('a->x', 'a', 'x')];

    expect(filterValidElements(elements)).toEqual([node('a')]);
  });

  it('removes edges where both source and target nodes are missing', () => {
    const elements = [node('a'), edge('x->y', 'x', 'y')];

    expect(filterValidElements(elements)).toEqual([node('a')]);
  });

  it('keeps nodes that have no edges', () => {
    const elements = [node('a'), node('b')];

    expect(filterValidElements(elements)).toEqual(elements);
  });

  it('returns an empty array when given an empty array', () => {
    expect(filterValidElements([])).toEqual([]);
  });

  it('handles a mix of valid and orphaned edges', () => {
    const elements = [
      node('a'),
      node('b'),
      edge('a->b', 'a', 'b'),
      edge('a->missing', 'a', 'missing'),
      edge('missing->b', 'missing', 'b'),
    ];

    expect(filterValidElements(elements)).toEqual([node('a'), node('b'), edge('a->b', 'a', 'b')]);
  });

  it('keeps multiple valid edges between the same nodes', () => {
    const elements = [node('a'), node('b'), edge('e1', 'a', 'b'), edge('e2', 'a', 'b')];

    expect(filterValidElements(elements)).toEqual(elements);
  });

  it('handles elements with only edges and no nodes', () => {
    const elements = [edge('a->b', 'a', 'b')];

    expect(filterValidElements(elements)).toEqual([]);
  });
});
