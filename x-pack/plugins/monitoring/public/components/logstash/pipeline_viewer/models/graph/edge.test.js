/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { Edge } from './edge';

describe('Edge', () => {
  let graph;
  let edgeJson;

  beforeEach(() => {
    graph = {
      verticesById: {
        myif: { cola: 'bar' },
        myes: { cola: 17 },
      },
    };
    edgeJson = {
      id: 'myif:myes',
      from: 'myif',
      to: 'myes',
    };
  });

  it('should have the correct from vertex', () => {
    const edge = new Edge(graph, edgeJson);
    expect(edge.fromId).to.be('myif');
    expect(edge.from).to.be(graph.verticesById.myif);
  });

  it('should have the correct to vertex', () => {
    const edge = new Edge(graph, edgeJson);
    expect(edge.toId).to.be('myes');
    expect(edge.to).to.be(graph.verticesById.myes);
  });
});
