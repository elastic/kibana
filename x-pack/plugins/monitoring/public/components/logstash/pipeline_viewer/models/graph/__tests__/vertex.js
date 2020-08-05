/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { Graph } from '../';

describe('Vertex', () => {
  let graph;

  /**
   *       my-prefix:...generator
   *                 |
   *                 v
   *             my-queue
   *                 |
   *                 v
   *               my-if
   *           (T) /   \ (F)
   *              v     v
   *         my-grok   my-sleep
   */
  const graphJson = {
    vertices: [
      { id: 'my-prefix:my-really-long-named-generator', type: 'plugin', explicit_id: false },
      { id: 'my-queue', type: 'queue', config_name: 'some-name' },
      { id: 'my-if', type: 'if', config_name: 'some-name' },
      {
        id: 'my-grok',
        type: 'plugin',
        meta: { source_text: 'foobar', source_line: 33, source_column: 4 },
      },
      {
        id: 'my-sleep',
        type: 'plugin',
        explicit_id: true,
        stats: { mystat1: 100, 'events.in': { min: 100, max: 120 } },
      },
    ],
    edges: [
      {
        id: 'abcdef',
        type: 'plain',
        from: 'my-prefix:my-really-long-named-generator',
        to: 'my-queue',
      },
      { id: '123456', type: 'plain', from: 'my-queue', to: 'my-if' },
      { id: 'if-true', type: 'plain', from: 'my-if', to: 'my-grok' },
      { id: 'if-false', type: 'plain', from: 'my-if', to: 'my-sleep' },
    ],
  };

  beforeEach(() => {
    graph = new Graph();
    graph.update(graphJson);
  });

  it('should update the internal json property when update() is called', () => {
    const vertex = graph.getVertexById('my-queue');
    const updatedJson = {
      config_name: 'my-stdin',
    };
    vertex.update(updatedJson);
    expect(vertex.json).to.eql(updatedJson);
  });

  it('should have the correct name', () => {
    const vertex = graph.getVertexById('my-queue');
    expect(vertex.name).to.be('some-name');
  });

  it('should return the JSON id directly as the id', () => {
    const vertex1 = graph.getVertexById('my-prefix:my-really-long-named-generator');
    expect(vertex1.id).to.be(vertex1.json.id);
  });

  it('should have the correct subtitle', () => {
    const vertex1 = graph.getVertexById('my-prefix:my-really-long-named-generator');
    expect(vertex1.subtitle).to.eql('my-prefix:my-really-long-named-generator');

    const vertex2 = graph.getVertexById('my-queue');
    expect(vertex2.subtitle).to.eql('my-queue');
  });

  it('should have the correct number of incoming edges', () => {
    const vertex1 = graph.getVertexById('my-prefix:my-really-long-named-generator');
    expect(vertex1.incomingEdges.length).to.be(0);

    const vertex2 = graph.getVertexById('my-queue');
    expect(vertex2.incomingEdges.length).to.be(1);

    const vertex3 = graph.getVertexById('my-if');
    expect(vertex3.incomingEdges.length).to.be(1);

    const vertex4 = graph.getVertexById('my-grok');
    expect(vertex4.incomingEdges.length).to.be(1);

    const vertex5 = graph.getVertexById('my-sleep');
    expect(vertex5.incomingEdges.length).to.be(1);
  });

  it('should have the correct number of incoming vertices', () => {
    const vertex1 = graph.getVertexById('my-prefix:my-really-long-named-generator');
    expect(vertex1.incomingVertices.length).to.be(0);

    const vertex2 = graph.getVertexById('my-queue');
    expect(vertex2.incomingVertices.length).to.be(1);

    const vertex3 = graph.getVertexById('my-if');
    expect(vertex3.incomingEdges.length).to.be(1);

    const vertex4 = graph.getVertexById('my-grok');
    expect(vertex4.incomingVertices.length).to.be(1);

    const vertex5 = graph.getVertexById('my-sleep');
    expect(vertex5.incomingEdges.length).to.be(1);
  });

  it('should have the correct number of outgoing edges', () => {
    const vertex1 = graph.getVertexById('my-prefix:my-really-long-named-generator');
    expect(vertex1.outgoingEdges.length).to.be(1);

    const vertex2 = graph.getVertexById('my-queue');
    expect(vertex2.outgoingEdges.length).to.be(1);

    const vertex3 = graph.getVertexById('my-if');
    expect(vertex3.outgoingEdges.length).to.be(2);

    const vertex4 = graph.getVertexById('my-grok');
    expect(vertex4.outgoingEdges.length).to.be(0);

    const vertex5 = graph.getVertexById('my-sleep');
    expect(vertex5.outgoingEdges.length).to.be(0);
  });

  it('should have the correct number of outgoing vertices', () => {
    const vertex1 = graph.getVertexById('my-prefix:my-really-long-named-generator');
    expect(vertex1.outgoingVertices.length).to.be(1);

    const vertex2 = graph.getVertexById('my-queue');
    expect(vertex2.outgoingVertices.length).to.be(1);

    const vertex3 = graph.getVertexById('my-if');
    expect(vertex3.outgoingVertices.length).to.be(2);

    const vertex4 = graph.getVertexById('my-grok');
    expect(vertex4.outgoingVertices.length).to.be(0);

    const vertex5 = graph.getVertexById('my-sleep');
    expect(vertex5.outgoingVertices.length).to.be(0);
  });

  it('should have the correct metadata', () => {
    const vertex = graph.getVertexById('my-grok');
    expect(vertex.meta).to.eql({ source_text: 'foobar', source_line: 33, source_column: 4 });
  });

  it('should have the correct stats', () => {
    const vertex1 = graph.getVertexById('my-sleep');
    expect(vertex1.stats).to.eql({ mystat1: 100, 'events.in': { min: 100, max: 120 } });

    const vertex2 = graph.getVertexById('my-grok');
    expect(vertex2.stats).to.eql({});
  });

  describe('lineage', () => {
    it('should have the correct descendants', () => {
      const vertex1 = graph.getVertexById('my-prefix:my-really-long-named-generator');
      expect(vertex1.descendants().vertices.length).to.be(4);
      expect(vertex1.descendants().edges.length).to.be(4);

      const vertex2 = graph.getVertexById('my-queue');
      expect(vertex2.descendants().vertices.length).to.be(3);
      expect(vertex2.descendants().edges.length).to.be(3);

      const vertex3 = graph.getVertexById('my-if');
      expect(vertex3.descendants().vertices.length).to.be(2);
      expect(vertex3.descendants().edges.length).to.be(2);

      const vertex4 = graph.getVertexById('my-grok');
      expect(vertex4.descendants()).to.eql({ vertices: [], edges: [] });

      const vertex5 = graph.getVertexById('my-sleep');
      expect(vertex5.descendants()).to.eql({ vertices: [], edges: [] });
    });

    describe('it should handle complex topologies correctly', () => {
      /**
       *                 I1
       *                 |
       *                 v
       *             my-queue
       *                 |
       *                 v
       *                IF1
       *           (T) /   \ (F)
       *              v     v
       *             IF2     F1
       *        (T) /  \(F)   |
       *          v     v    v
       *         F2     F3   F4
       *          \      \  /
       *            \---- v
       *                  F5
       */
      const complexGraphJson = {
        vertices: [
          { id: 'I1', type: 'plugin', explicit_id: false },
          { id: 'my-queue', type: 'queue', config_name: 'some-name' },
          { id: 'IF1', type: 'if', config_name: 'some-name' },
          {
            id: 'IF2',
            type: 'plugin',
            meta: { source_text: 'foobar', source_line: 33, source_column: 4 },
          },
          { id: 'F1', type: 'plugin', explicit_id: true },
          { id: 'F2', type: 'plugin', explicit_id: true },
          { id: 'F3', type: 'plugin', explicit_id: true },
          { id: 'F4', type: 'plugin', explicit_id: true },
          { id: 'F5', type: 'plugin', explicit_id: true },
        ],
        edges: [
          { id: '1', type: 'plain', from: 'I1', to: 'my-queue' },
          { id: '2', type: 'plain', from: 'my-queue', to: 'IF1' },
          { id: '3', type: 'boolean', when: true, from: 'IF1', to: 'IF2' },
          { id: '4', type: 'boolean', when: false, from: 'IF1', to: 'F1' },
          { id: '5', type: 'boolean', when: true, from: 'IF2', to: 'F2' },
          { id: '6', type: 'boolean', when: false, from: 'IF2', to: 'F3' },
          { id: '7', type: 'plain', from: 'F2', to: 'F5' },
          { id: '8', type: 'plain', from: 'F3', to: 'F5' },
          { id: '9', type: 'plain', from: 'F1', to: 'F4' },
          { id: '10', type: 'plain', from: 'F4', to: 'F5' },
        ],
      };

      beforeEach(() => {
        graph = new Graph();
        graph.update(complexGraphJson);
      });
    });
  });

  it('should correctly identify if it has an explicit ID', () => {
    const vertex1 = graph.getVertexById('my-prefix:my-really-long-named-generator');
    expect(vertex1.hasExplicitId).to.be(false);

    const vertex2 = graph.getVertexById('my-sleep');
    expect(vertex2.hasExplicitId).to.be(true);
  });
});
