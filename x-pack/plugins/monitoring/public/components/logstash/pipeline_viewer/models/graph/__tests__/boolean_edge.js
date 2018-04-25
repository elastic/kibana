/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { BooleanEdge } from '../boolean_edge';
import { Edge } from '../edge';
import { LOGSTASH } from '../../../../../../../common/constants';

describe('BooleanEdge', () => {
  let graph;
  let edgeJson;

  beforeEach(() => {
    graph = {
      verticesById: {
        myif: {},
        myes: {}
      }
    };
    edgeJson = {
      id: 'abcdef',
      from: 'myif',
      to: 'myes',
      when: true
    };
  });

  it('should be an instance of Edge', () => {
    const booleanEdge = new BooleanEdge(graph, edgeJson);
    expect(booleanEdge).to.be.a(Edge);
  });

  it('should have the correct SVG CSS class', () => {
    const booleanEdge = new BooleanEdge(graph, edgeJson);
    const edgeSvgClass = LOGSTASH.PIPELINE_VIEWER.GRAPH.EDGES.SVG_CLASS;
    expect(booleanEdge.svgClass).to.be(`${edgeSvgClass} ${edgeSvgClass}Boolean ${edgeSvgClass}Boolean--true`);
  });
});