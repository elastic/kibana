/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { IfVertex } from '../if_vertex';
import { Vertex } from '../vertex';
import ifIcon from '@elastic/eui/src/components/icon/assets/logstash_if.svg';

describe('IfVertex', () => {
  let graph;
  let vertexJson;

  beforeEach(() => {
    graph = {};
    vertexJson = {
      condition: '[action] == "login"'
    };
  });

  it('should be an instance of Vertex', () => {
    const ifVertex = new IfVertex(graph, vertexJson);
    expect(ifVertex).to.be.a(Vertex);
  });

  it('should have a type of if', () => {
    const ifVertex = new IfVertex(graph, vertexJson);
    expect(ifVertex.typeString).to.be('if');
  });

  it('should have the condition as its name', () => {
    const ifVertex = new IfVertex(graph, vertexJson);
    expect(ifVertex.name).to.be('[action] == "login"');
  });

  it('should use the correct icon', () => {
    const ifVertex = new IfVertex(graph, vertexJson);
    expect(ifVertex.icon).to.be(ifIcon);
  });
});