/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { vertexFactory } from './vertex_factory';
import { PluginVertex } from './plugin_vertex';
import { IfVertex } from './if_vertex';
import { QueueVertex } from './queue_vertex';

describe('vertexFactory', () => {
  let graph;
  let vertexJson;

  beforeEach(() => {
    graph = {
      verticesById: {
        mygenerator: {},
        myqueue: {},
      },
    };
    vertexJson = {
      id: 'something',
    };
  });

  it('returns a PluginVertex when vertex type is plugin', () => {
    vertexJson.type = 'plugin';
    expect(vertexFactory(graph, vertexJson)).to.be.a(PluginVertex);
  });

  it('returns a IfVertex when vertex type is if', () => {
    vertexJson.type = 'if';
    expect(vertexFactory(graph, vertexJson)).to.be.a(IfVertex);
  });

  it('returns a QueueVertex when vertex type is queue', () => {
    vertexJson.type = 'queue';
    expect(vertexFactory(graph, vertexJson)).to.be.a(QueueVertex);
  });

  it('throws an error when vertex type is unknown', () => {
    vertexJson.type = 'foobar';
    const fn = () => vertexFactory(graph, vertexJson);
    expect(fn).to.throwError();
  });
});
