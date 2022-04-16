/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { Graph } from '.';
import { Vertex } from './vertex';
import { PluginVertex } from './plugin_vertex';
import { Edge } from './edge';

describe('Graph', () => {
  let graphJson;
  let graph;

  it('initializes the Graph object correctly', () => {
    graph = new Graph();
    expect(graph.json).to.be(null);
    expect(graph.verticesById).to.eql({});
    expect(graph.edgesById).to.eql({});
    expect(graph.edgesByFrom).to.eql({});
    expect(graph.edgesByTo).to.eql({});
  });

  describe('updating the Graph object', () => {
    beforeEach(() => {
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
      graphJson = {
        vertices: [
          { id: 'my-prefix:my-really-long-named-generator', type: 'plugin', explicit_id: false },
          { id: 'my-queue', type: 'queue', config_name: 'some-name' },
          { id: 'my-if', type: 'if', config_name: 'some-name' },
          { id: 'my-grok', type: 'plugin', plugin_type: 'filter' },
          { id: 'my-sleep', type: 'plugin', plugin_type: 'filter', explicit_id: true },
        ],
        edges: [
          {
            id: 'abcdef',
            type: 'plain',
            from: 'my-prefix:my-really-long-named-generator',
            to: 'my-queue',
          },
          { id: '123456', type: 'plain', from: 'my-queue', to: 'my-if' },
          { id: 'if-true', type: 'boolean', when: true, from: 'my-if', to: 'my-grok' },
          { id: 'if-false', type: 'boolean', when: false, from: 'my-if', to: 'my-sleep' },
        ],
      };
      graph = new Graph();
      graph.update(graphJson);
    });

    it('updates the internal json correctly', () => {
      expect(graph.json).to.eql(graphJson);
    });

    it('updates vertices-by-id correctly', () => {
      expect(Object.keys(graph.verticesById).length).to.be(5);
      expect(graph.verticesById['my-prefix:my-really-long-named-generator']).to.be.a(Vertex);
      expect(graph.verticesById['my-queue']).to.be.a(Vertex);
      expect(graph.verticesById['my-if']).to.be.a(Vertex);
      expect(graph.verticesById['my-grok']).to.be.a(Vertex);
      expect(graph.verticesById['my-sleep']).to.be.a(Vertex);
    });

    it('updates edges-by-id correctly', () => {
      expect(Object.keys(graph.edgesById).length).to.be(4);
      expect(graph.edgesById.abcdef).to.be.an(Edge);
      expect(graph.edgesById['123456']).to.be.an(Edge);
      expect(graph.edgesById['if-true']).to.be.an(Edge);
      expect(graph.edgesById['if-false']).to.be.an(Edge);
    });

    it('updates edges-by-from correctly', () => {
      expect(Object.keys(graph.edgesByFrom).length).to.be(3);

      expect(graph.edgesByFrom['my-prefix:my-really-long-named-generator']).to.be.an(Array);
      expect(graph.edgesByFrom['my-prefix:my-really-long-named-generator'].length).to.be(1);

      expect(graph.edgesByFrom['my-queue']).to.be.an(Array);
      expect(graph.edgesByFrom['my-queue'].length).to.be(1);

      expect(graph.edgesByFrom['my-if']).to.be.an(Array);
      expect(graph.edgesByFrom['my-if'].length).to.be(2);
    });

    it('updates edges-by-to correctly', () => {
      expect(Object.keys(graph.edgesByTo).length).to.be(4);

      expect(graph.edgesByTo['my-queue']).to.be.an(Array);
      expect(graph.edgesByTo['my-queue'].length).to.be(1);

      expect(graph.edgesByTo['my-if']).to.be.an(Array);
      expect(graph.edgesByTo['my-if'].length).to.be(1);

      expect(graph.edgesByTo['my-grok']).to.be.an(Array);
      expect(graph.edgesByTo['my-grok'].length).to.be(1);

      expect(graph.edgesByTo['my-sleep']).to.be.an(Array);
      expect(graph.edgesByTo['my-sleep'].length).to.be(1);
    });

    it('identifies the correct vertex by ID', () => {
      const vertex1 = graph.getVertexById('my-prefix:my-really-long-named-generator');
      expect(vertex1).to.be.a(Vertex);
      expect(vertex1.json.id).to.be('my-prefix:my-really-long-named-generator');

      const vertex2 = graph.getVertexById('my-sleep');
      expect(vertex2).to.be.a(Vertex);
      expect(vertex2.json.id).to.be('my-sleep');
    });

    it('identifies the same vertices in a deterministic order', () => {
      const vertices1 = graph.getVertices();
      expect(vertices1).to.be.an(Array);
      expect(vertices1.length).to.be(5);

      vertices1.forEach((vertex1) => {
        expect(vertex1).to.be.a(Vertex);
      });

      const vertices2 = graph.getVertices();
      vertices2.forEach((vertex2, i) => {
        expect(vertex2).to.be(vertices1[i]);
      });
    });

    it('identifies the correct processor vertices', () => {
      const processorVertices = graph.processorVertices;
      expect(processorVertices).to.be.an(Array);
      expect(processorVertices.length).to.be(2);

      processorVertices.forEach((processorVertex) => {
        expect(processorVertex).to.be.a(Vertex);
        expect(processorVertex).to.be.a(PluginVertex);
        expect(processorVertex.isProcessor).to.be(true);
      });
    });

    it('identifies the correct edges', () => {
      const edges = graph.edges;
      expect(edges).to.be.an(Array);
      expect(edges.length).to.be(4);

      edges.forEach((edge) => {
        expect(edge).to.be.an(Edge);
      });
    });
  });

  describe('assigning pipeline stages', () => {
    describe('Pipeline with one input plugin statement', () => {
      beforeEach(() => {
        graphJson = {
          vertices: [
            {
              id: 'tweet_harvester',
              explicit_id: true,
              type: 'plugin',
              plugin_type: 'input',
              config_name: 'twitter',
              stats: {},
            },
            {
              id: '__QUEUE__',
              explicit_id: false,
              type: 'queue',
              stats: {},
            },
          ],
          edges: [
            {
              id: '0296ae28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f',
              from: 'tweet_harvester',
              to: '__QUEUE__',
              type: 'plain',
            },
          ],
        };
      });

      it('assigns the pipeline stages correctly', () => {
        graph = new Graph();
        graph.update(graphJson);

        expect(graph.getVertices().length).to.be(2);
        expect(graph.edges.length).to.be(1);

        expect(graph.getVertices().filter((v) => !v.pipelineStage).length).to.be(1);
        expect(graph.getVertices().filter((v) => v.pipelineStage === 'input').length).to.be(1);
        expect(graph.hasQueueVertex).to.be(true);
        expect(graph.getVertices().filter((v) => v.pipelineStage === 'filter').length).to.be(0);
        expect(graph.getVertices().filter((v) => v.pipelineStage === 'output').length).to.be(0);
      });
    });

    describe('Pipeline with one filter plugin statement', () => {
      beforeEach(() => {
        graphJson = {
          vertices: [
            {
              id: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
              explicit_id: false,
              type: 'plugin',
              plugin_type: 'filter',
              config_name: 'grok',
              stats: {},
            },
          ],
          edges: [],
        };
      });

      it('assigns the pipeline stages correctly', () => {
        graph = new Graph();
        graph.update(graphJson);

        expect(graph.getVertices().length).to.be(1);
        expect(graph.edges.length).to.be(0);

        expect(graph.getVertices().filter((v) => !v.pipelineStage).length).to.be(0);
        expect(graph.getVertices().filter((v) => v.pipelineStage === 'input').length).to.be(0);
        expect(graph.hasQueueVertex).to.be(false);
        expect(graph.getVertices().filter((v) => v.pipelineStage === 'filter').length).to.be(1);
        expect(graph.getVertices().filter((v) => v.pipelineStage === 'output').length).to.be(0);
      });
    });

    describe('Pipeline with one output plugin statement', () => {
      beforeEach(() => {
        graphJson = {
          vertices: [
            {
              id: 'es',
              explicit_id: true,
              config_name: 'elasticsearch',
              type: 'plugin',
              plugin_type: 'output',
              stats: {},
            },
          ],
          edges: [],
        };
      });

      it('assigns the pipeline stages correctly', () => {
        graph = new Graph();
        graph.update(graphJson);

        expect(graph.getVertices().length).to.be(1);
        expect(graph.edges.length).to.be(0);

        expect(graph.getVertices().filter((v) => !v.pipelineStage).length).to.be(0);
        expect(graph.getVertices().filter((v) => v.pipelineStage === 'input').length).to.be(0);
        expect(graph.hasQueueVertex).to.be(false);
        expect(graph.getVertices().filter((v) => v.pipelineStage === 'filter').length).to.be(0);
        expect(graph.getVertices().filter((v) => v.pipelineStage === 'output').length).to.be(1);
      });
    });

    describe('Pipeline with one input plugin statement and one filter plugin statement', () => {
      beforeEach(() => {
        graphJson = {
          vertices: [
            {
              id: 'tweet_harvester',
              explicit_id: true,
              type: 'plugin',
              plugin_type: 'input',
              config_name: 'twitter',
              stats: {},
            },
            {
              id: '__QUEUE__',
              explicit_id: false,
              type: 'queue',
              stats: {},
            },
            {
              id: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
              explicit_id: false,
              type: 'plugin',
              plugin_type: 'filter',
              config_name: 'grok',
              stats: {},
            },
          ],
          edges: [
            {
              id: '0296ae28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f',
              from: 'tweet_harvester',
              to: '__QUEUE__',
              type: 'plain',
            },
            {
              id: '35591f523dee3465d4c38f20232c56db453a9e4258af5885bf8c79f517690bc5',
              from: '__QUEUE__',
              to: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
              type: 'plain',
            },
          ],
        };
      });

      it('assigns the pipeline stages correctly', () => {
        graph = new Graph();
        graph.update(graphJson);

        expect(graph.getVertices().length).to.be(3);
        expect(graph.edges.length).to.be(2);

        expect(graph.getVertices().filter((v) => !v.pipelineStage).length).to.be(1);
        expect(graph.getVertices().filter((v) => v.pipelineStage === 'input').length).to.be(1);
        expect(graph.hasQueueVertex).to.be(true);
        expect(graph.getVertices().filter((v) => v.pipelineStage === 'filter').length).to.be(1);
        expect(graph.getVertices().filter((v) => v.pipelineStage === 'output').length).to.be(0);
      });
    });

    describe('Pipeline with one input plugin statement and one output plugin statement', () => {
      beforeEach(() => {
        graphJson = {
          vertices: [
            {
              id: 'tweet_harvester',
              explicit_id: true,
              type: 'plugin',
              plugin_type: 'input',
              config_name: 'twitter',
              stats: {},
            },
            {
              id: '__QUEUE__',
              explicit_id: false,
              type: 'queue',
              stats: {},
            },
            {
              id: 'es',
              explicit_id: true,
              config_name: 'elasticsearch',
              type: 'plugin',
              plugin_type: 'output',
              stats: {},
            },
          ],
          edges: [
            {
              id: '0296ae28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f',
              from: 'tweet_harvester',
              to: '__QUEUE__',
              type: 'plain',
            },
            {
              id: '35591f523dee3465d4c38f20232c56db453a9e4258af5885bf8c79f517690bc5',
              from: '__QUEUE__',
              to: 'es',
              type: 'plain',
            },
          ],
        };
      });

      it('assigns the pipeline stages correctly', () => {
        graph = new Graph();
        graph.update(graphJson);

        expect(graph.getVertices().length).to.be(3);
        expect(graph.edges.length).to.be(2);

        expect(graph.getVertices().filter((v) => !v.pipelineStage).length).to.be(1);
        expect(graph.getVertices().filter((v) => v.pipelineStage === 'input').length).to.be(1);
        expect(graph.hasQueueVertex).to.be(true);
        expect(graph.getVertices().filter((v) => v.pipelineStage === 'filter').length).to.be(0);
        expect(graph.getVertices().filter((v) => v.pipelineStage === 'output').length).to.be(1);
      });
    });

    describe('Pipeline with one filter plugin statement and one output plugin statement', () => {
      beforeEach(() => {
        graphJson = {
          vertices: [
            {
              id: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
              explicit_id: false,
              type: 'plugin',
              plugin_type: 'filter',
              config_name: 'grok',
              stats: {},
            },
            {
              id: 'es',
              explicit_id: true,
              config_name: 'elasticsearch',
              type: 'plugin',
              plugin_type: 'output',
              stats: {},
            },
          ],
          edges: [
            {
              id: '35591f523dee3465d4c38f20232c56db453a9e4258af5885bf8c79f517690bc5',
              from: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
              to: 'es',
              type: 'plain',
            },
          ],
        };
      });

      it('assigns the pipeline stages correctly', () => {
        graph = new Graph();
        graph.update(graphJson);

        expect(graph.getVertices().length).to.be(2);
        expect(graph.edges.length).to.be(1);

        expect(graph.getVertices().filter((v) => !v.pipelineStage).length).to.be(0);
        expect(graph.getVertices().filter((v) => v.pipelineStage === 'input').length).to.be(0);
        expect(graph.hasQueueVertex).to.be(false);
        expect(graph.getVertices().filter((v) => v.pipelineStage === 'filter').length).to.be(1);
        expect(graph.getVertices().filter((v) => v.pipelineStage === 'output').length).to.be(1);
      });
    });

    describe('Pipeline with one input plugin statement, one filter plugin statement, and one output plugin statement', () => {
      beforeEach(() => {
        graphJson = {
          vertices: [
            {
              id: 'tweet_harvester',
              explicit_id: true,
              type: 'plugin',
              plugin_type: 'input',
              config_name: 'twitter',
              stats: {},
            },
            {
              id: '__QUEUE__',
              explicit_id: false,
              type: 'queue',
              stats: {},
            },
            {
              id: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
              explicit_id: false,
              type: 'plugin',
              plugin_type: 'filter',
              config_name: 'grok',
              stats: {},
            },
            {
              id: 'es',
              explicit_id: true,
              config_name: 'elasticsearch',
              type: 'plugin',
              plugin_type: 'output',
              stats: {},
            },
          ],
          edges: [
            {
              id: '0296ae28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f',
              from: 'tweet_harvester',
              to: '__QUEUE__',
              type: 'plain',
            },
            {
              id: '96ae28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f02',
              from: '__QUEUE__',
              to: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
              type: 'plain',
            },
            {
              id: '35591f523dee3465d4c38f20232c56db453a9e4258af5885bf8c79f517690bc5',
              from: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
              to: 'es',
              type: 'plain',
            },
          ],
        };
      });

      it('assigns the pipeline stages correctly', () => {
        graph = new Graph();
        graph.update(graphJson);

        expect(graph.getVertices().length).to.be(4);
        expect(graph.edges.length).to.be(3);

        expect(graph.getVertices().filter((v) => !v.pipelineStage).length).to.be(1);
        expect(graph.getVertices().filter((v) => v.pipelineStage === 'input').length).to.be(1);
        expect(graph.hasQueueVertex).to.be(true);
        expect(graph.getVertices().filter((v) => v.pipelineStage === 'filter').length).to.be(1);
        expect(graph.getVertices().filter((v) => v.pipelineStage === 'output').length).to.be(1);
      });
    });

    describe('Pipeline with one filter if statement', () => {
      beforeEach(() => {
        graphJson = {
          vertices: [
            {
              id: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
              explicit_id: false,
              type: 'if',
              condition: '[is_rt] == "RT"',
              stats: {},
            },
            {
              id: 'log_line_parser',
              explicit_id: true,
              config_name: 'grok',
              type: 'plugin',
              plugin_type: 'filter',
              stats: {},
            },
          ],
          edges: [
            {
              id: '35591f523dee3465d4c38f20232c56db453a9e4258af5885bf8c79f517690bc5',
              from: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
              to: 'log_line_parser',
              type: 'boolean',
              when: true,
            },
          ],
        };
      });

      it('assigns the pipeline stages correctly', () => {
        graph = new Graph();
        graph.update(graphJson);

        expect(graph.getVertices().length).to.be(2);
        expect(graph.edges.length).to.be(1);

        expect(graph.getVertices().filter((v) => !v.pipelineStage).length).to.be(0);
        expect(graph.getVertices().filter((v) => v.pipelineStage === 'input').length).to.be(0);
        expect(graph.hasQueueVertex).to.be(false);
        expect(graph.getVertices().filter((v) => v.pipelineStage === 'filter').length).to.be(2);
        expect(graph.getVertices().filter((v) => v.pipelineStage === 'output').length).to.be(0);
      });
    });

    describe('Pipeline with one output if statement', () => {
      beforeEach(() => {
        graphJson = {
          vertices: [
            {
              id: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
              explicit_id: false,
              type: 'if',
              condition: '[is_rt] == "RT"',
              stats: {},
            },
            {
              id: 'es',
              explicit_id: true,
              config_name: 'elasticsearch',
              type: 'plugin',
              plugin_type: 'output',
              stats: {},
            },
          ],
          edges: [
            {
              id: '35591f523dee3465d4c38f20232c56db453a9e4258af5885bf8c79f517690bc5',
              from: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
              to: 'es',
              type: 'boolean',
              when: true,
            },
          ],
        };
      });

      it('assigns the pipeline stages correctly', () => {
        graph = new Graph();
        graph.update(graphJson);

        expect(graph.getVertices().length).to.be(2);
        expect(graph.edges.length).to.be(1);

        expect(graph.getVertices().filter((v) => !v.pipelineStage).length).to.be(0);
        expect(graph.getVertices().filter((v) => v.pipelineStage === 'input').length).to.be(0);
        expect(graph.hasQueueVertex).to.be(false);
        expect(graph.getVertices().filter((v) => v.pipelineStage === 'filter').length).to.be(0);
        expect(graph.getVertices().filter((v) => v.pipelineStage === 'output').length).to.be(2);
      });
    });

    describe('Pipeline with one input plugin statement and one filter if statement', () => {
      beforeEach(() => {
        graphJson = {
          vertices: [
            {
              id: 'tweet_harvester',
              explicit_id: true,
              type: 'plugin',
              plugin_type: 'input',
              config_name: 'twitter',
              stats: {},
            },
            {
              id: '__QUEUE__',
              explicit_id: false,
              type: 'queue',
              stats: {},
            },
            {
              id: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
              explicit_id: false,
              type: 'if',
              condition: '[is_rt] == "RT"',
              stats: {},
            },
            {
              id: 'log_line_parser',
              explicit_id: true,
              config_name: 'grok',
              type: 'plugin',
              plugin_type: 'filter',
              stats: {},
            },
          ],
          edges: [
            {
              id: '0296ae28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f',
              from: 'tweet_harvester',
              to: '__QUEUE__',
              type: 'plain',
            },
            {
              id: '96ae28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f02',
              from: '__QUEUE__',
              to: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
              type: 'plain',
            },
            {
              id: '35591f523dee3465d4c38f20232c56db453a9e4258af5885bf8c79f517690bc5',
              from: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
              to: 'log_line_parser',
              type: 'boolean',
              when: true,
            },
          ],
        };
      });

      it('assigns the pipeline stages correctly', () => {
        graph = new Graph();
        graph.update(graphJson);

        expect(graph.getVertices().length).to.be(4);
        expect(graph.edges.length).to.be(3);

        expect(graph.getVertices().filter((v) => !v.pipelineStage).length).to.be(1);
        expect(graph.getVertices().filter((v) => v.pipelineStage === 'input').length).to.be(1);
        expect(graph.hasQueueVertex).to.be(true);
        expect(graph.getVertices().filter((v) => v.pipelineStage === 'filter').length).to.be(2);
        expect(graph.getVertices().filter((v) => v.pipelineStage === 'output').length).to.be(0);
      });
    });

    describe('Pipeline with one input plugin statement and one output if statement', () => {
      beforeEach(() => {
        graphJson = {
          vertices: [
            {
              id: 'tweet_harvester',
              explicit_id: true,
              type: 'plugin',
              plugin_type: 'input',
              config_name: 'twitter',
              stats: {},
            },
            {
              id: '__QUEUE__',
              explicit_id: false,
              type: 'queue',
              stats: {},
            },
            {
              id: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
              explicit_id: false,
              type: 'if',
              condition: '[is_rt] == "RT"',
              stats: {},
            },
            {
              id: 'es',
              explicit_id: true,
              config_name: 'elasticsearch',
              type: 'plugin',
              plugin_type: 'output',
              stats: {},
            },
          ],
          edges: [
            {
              id: '0296ae28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f',
              from: 'tweet_harvester',
              to: '__QUEUE__',
              type: 'plain',
            },
            {
              id: '96ae28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f02',
              from: '__QUEUE__',
              to: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
              type: 'plain',
            },
            {
              id: '35591f523dee3465d4c38f20232c56db453a9e4258af5885bf8c79f517690bc5',
              from: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
              to: 'es',
              type: 'boolean',
              when: true,
            },
          ],
        };
      });

      it('assigns the pipeline stages correctly', () => {
        graph = new Graph();
        graph.update(graphJson);

        expect(graph.getVertices().length).to.be(4);
        expect(graph.edges.length).to.be(3);

        expect(graph.getVertices().filter((v) => !v.pipelineStage).length).to.be(1);
        expect(graph.getVertices().filter((v) => v.pipelineStage === 'input').length).to.be(1);
        expect(graph.hasQueueVertex).to.be(true);
        expect(graph.getVertices().filter((v) => v.pipelineStage === 'filter').length).to.be(0);
        expect(graph.getVertices().filter((v) => v.pipelineStage === 'output').length).to.be(2);
      });
    });

    describe('Pipeline with one filter if statement and one output if statement', () => {
      beforeEach(() => {
        graphJson = {
          vertices: [
            {
              id: 'a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84',
              explicit_id: false,
              type: 'if',
              condition: '[is_rt] == "RT"',
              stats: {},
            },
            {
              id: 'log_line_parser',
              explicit_id: true,
              config_name: 'grok',
              type: 'plugin',
              plugin_type: 'filter',
              stats: {},
            },
            {
              id: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
              explicit_id: false,
              type: 'if',
              condition: '[is_rt] == "RT"',
              stats: {},
            },
            {
              id: 'es',
              explicit_id: true,
              config_name: 'elasticsearch',
              type: 'plugin',
              plugin_type: 'output',
              stats: {},
            },
          ],
          edges: [
            {
              id: '0296ae28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f',
              from: 'a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84',
              to: 'log_line_parser',
              type: 'boolean',
              when: true,
            },
            {
              id: '296ae28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f0',
              from: 'a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84',
              to: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
              type: 'boolean',
              when: false,
            },
            {
              id: '96ae28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f02',
              from: 'log_line_parser',
              to: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
              type: 'plain',
            },
            {
              id: '35591f523dee3465d4c38f20232c56db453a9e4258af5885bf8c79f517690bc5',
              from: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
              to: 'es',
              type: 'boolean',
              when: true,
            },
          ],
        };
      });

      it('assigns the pipeline stages correctly', () => {
        graph = new Graph();
        graph.update(graphJson);

        expect(graph.getVertices().length).to.be(4);
        expect(graph.edges.length).to.be(4);

        expect(graph.getVertices().filter((v) => !v.pipelineStage).length).to.be(0);
        expect(graph.getVertices().filter((v) => v.pipelineStage === 'input').length).to.be(0);
        expect(graph.hasQueueVertex).to.be(false);
        expect(graph.getVertices().filter((v) => v.pipelineStage === 'filter').length).to.be(2);
        expect(graph.getVertices().filter((v) => v.pipelineStage === 'output').length).to.be(2);
      });
    });

    describe('Pipeline with one input plugin statement, one filter if statement, and one output if statement', () => {
      beforeEach(() => {
        graphJson = {
          vertices: [
            {
              id: 'tweet_harvester',
              explicit_id: true,
              type: 'plugin',
              plugin_type: 'input',
              config_name: 'twitter',
              stats: {},
            },
            {
              id: '__QUEUE__',
              explicit_id: false,
              type: 'queue',
              stats: {},
            },
            {
              id: 'a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84',
              explicit_id: false,
              type: 'if',
              condition: '[is_rt] == "RT"',
              stats: {},
            },
            {
              id: 'log_line_parser',
              explicit_id: true,
              config_name: 'grok',
              type: 'plugin',
              plugin_type: 'filter',
              stats: {},
            },
            {
              id: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
              explicit_id: false,
              type: 'if',
              condition: '[is_rt] == "RT"',
              stats: {},
            },
            {
              id: 'es',
              explicit_id: true,
              config_name: 'elasticsearch',
              type: 'plugin',
              plugin_type: 'output',
              stats: {},
            },
          ],
          edges: [
            {
              id: '0296ae28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f',
              from: 'tweet_harvester',
              to: '__QUEUE__',
              type: 'plain',
            },
            {
              id: 'ae28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f0296',
              from: '__QUEUE__',
              to: 'a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84',
              type: 'plain',
            },
            {
              id: 'e28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f0296a',
              from: 'a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84',
              to: 'log_line_parser',
              type: 'boolean',
              when: true,
            },
            {
              id: '296ae28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f0',
              from: 'a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84',
              to: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
              type: 'boolean',
              when: false,
            },
            {
              id: '96ae28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f02',
              from: 'log_line_parser',
              to: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
              type: 'plain',
            },
            {
              id: '35591f523dee3465d4c38f20232c56db453a9e4258af5885bf8c79f517690bc5',
              from: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
              to: 'es',
              type: 'boolean',
              when: true,
            },
          ],
        };
      });

      it('assigns the pipeline stages correctly', () => {
        graph = new Graph();
        graph.update(graphJson);

        expect(graph.getVertices().length).to.be(6);
        expect(graph.edges.length).to.be(6);

        expect(graph.getVertices().filter((v) => !v.pipelineStage).length).to.be(1);
        expect(graph.getVertices().filter((v) => v.pipelineStage === 'input').length).to.be(1);
        expect(graph.hasQueueVertex).to.be(true);
        expect(graph.getVertices().filter((v) => v.pipelineStage === 'filter').length).to.be(2);
        expect(graph.getVertices().filter((v) => v.pipelineStage === 'output').length).to.be(2);
      });
    });

    describe('Pipeline with two input plugin statements', () => {
      beforeEach(() => {
        graphJson = {
          vertices: [
            {
              id: 'tweet_harvester',
              explicit_id: true,
              type: 'plugin',
              plugin_type: 'input',
              config_name: 'twitter',
              stats: {},
            },
            {
              id: '296ae28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f0',
              explicit_id: false,
              type: 'plugin',
              plugin_type: 'input',
              config_name: 'stdin',
              stats: {},
            },
            {
              id: '__QUEUE__',
              explicit_id: false,
              type: 'queue',
              stats: {},
            },
          ],
          edges: [
            {
              id: '0296ae28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f',
              from: 'tweet_harvester',
              to: '__QUEUE__',
              type: 'plain',
            },
            {
              id: '96ae28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f02',
              from: '296ae28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f0',
              to: '__QUEUE__',
              type: 'plain',
            },
          ],
        };
      });

      it('assigns the pipeline stages correctly', () => {
        graph = new Graph();
        graph.update(graphJson);

        expect(graph.getVertices().length).to.be(3);
        expect(graph.edges.length).to.be(2);

        expect(graph.getVertices().filter((v) => !v.pipelineStage).length).to.be(1);
        expect(graph.getVertices().filter((v) => v.pipelineStage === 'input').length).to.be(2);
        expect(graph.hasQueueVertex).to.be(true);
        expect(graph.getVertices().filter((v) => v.pipelineStage === 'filter').length).to.be(0);
        expect(graph.getVertices().filter((v) => v.pipelineStage === 'output').length).to.be(0);
      });
    });

    describe('Pipeline with two filter plugin statements', () => {
      beforeEach(() => {
        graphJson = {
          vertices: [
            {
              id: 'log_line_parser',
              explicit_id: true,
              type: 'plugin',
              plugin_type: 'filter',
              config_name: 'grok',
              stats: {},
            },
            {
              id: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
              explicit_id: false,
              type: 'plugin',
              plugin_type: 'filter',
              config_name: 'mutate',
              stats: {},
            },
          ],
          edges: [
            {
              id: '96ae28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f02',
              from: 'log_line_parser',
              to: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
              type: 'plain',
            },
          ],
        };
      });

      it('assigns the pipeline stages correctly', () => {
        graph = new Graph();
        graph.update(graphJson);

        expect(graph.getVertices().length).to.be(2);
        expect(graph.edges.length).to.be(1);

        expect(graph.getVertices().filter((v) => !v.pipelineStage).length).to.be(0);
        expect(graph.getVertices().filter((v) => v.pipelineStage === 'input').length).to.be(0);
        expect(graph.hasQueueVertex).to.be(false);
        expect(graph.getVertices().filter((v) => v.pipelineStage === 'filter').length).to.be(2);
        expect(graph.getVertices().filter((v) => v.pipelineStage === 'output').length).to.be(0);
      });
    });

    describe('Pipeline with two output plugin statements', () => {
      beforeEach(() => {
        graphJson = {
          vertices: [
            {
              id: 'es',
              explicit_id: true,
              config_name: 'elasticsearch',
              type: 'plugin',
              plugin_type: 'output',
              stats: {},
            },
            {
              id: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
              explicit_id: false,
              type: 'plugin',
              plugin_type: 'output',
              config_name: 'stdout',
              stats: {},
            },
          ],
          edges: [],
        };
      });

      it('assigns the pipeline stages correctly', () => {
        graph = new Graph();
        graph.update(graphJson);

        expect(graph.getVertices().length).to.be(2);
        expect(graph.edges.length).to.be(0);

        expect(graph.getVertices().filter((v) => !v.pipelineStage).length).to.be(0);
        expect(graph.getVertices().filter((v) => v.pipelineStage === 'input').length).to.be(0);
        expect(graph.hasQueueVertex).to.be(false);
        expect(graph.getVertices().filter((v) => v.pipelineStage === 'filter').length).to.be(0);
        expect(graph.getVertices().filter((v) => v.pipelineStage === 'output').length).to.be(2);
      });
    });

    describe('Pipeline with one filter plugin statement and one filter if statement', () => {
      beforeEach(() => {
        graphJson = {
          vertices: [
            {
              id: 'log_line_parser',
              explicit_id: true,
              type: 'plugin',
              plugin_type: 'filter',
              config_name: 'grok',
              stats: {},
            },
            {
              id: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
              explicit_id: false,
              type: 'if',
              condition: '[is_rt] == "RT"',
              stats: {},
            },
            {
              id: 'a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84',
              explicit_id: false,
              type: 'plugin',
              plugin_type: 'filter',
              config_name: 'mutate',
              stats: {},
            },
          ],
          edges: [
            {
              id: '96ae28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f02',
              from: 'log_line_parser',
              to: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
              type: 'plain',
            },
            {
              id: '35591f523dee3465d4c38f20232c56db453a9e4258af5885bf8c79f517690bc5',
              from: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
              to: 'a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84',
              type: 'boolean',
              when: true,
            },
          ],
        };
      });

      it('assigns the pipeline stages correctly', () => {
        graph = new Graph();
        graph.update(graphJson);

        expect(graph.getVertices().length).to.be(3);
        expect(graph.edges.length).to.be(2);

        expect(graph.getVertices().filter((v) => !v.pipelineStage).length).to.be(0);
        expect(graph.getVertices().filter((v) => v.pipelineStage === 'input').length).to.be(0);
        expect(graph.hasQueueVertex).to.be(false);
        expect(graph.getVertices().filter((v) => v.pipelineStage === 'filter').length).to.be(3);
        expect(graph.getVertices().filter((v) => v.pipelineStage === 'output').length).to.be(0);
      });
    });

    describe('Pipeline with two filter plugin statements and one filter if statement', () => {
      beforeEach(() => {
        graphJson = {
          vertices: [
            {
              id: 'log_line_parser',
              explicit_id: true,
              type: 'plugin',
              plugin_type: 'filter',
              config_name: 'grok',
              stats: {},
            },
            {
              id: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
              explicit_id: false,
              type: 'if',
              condition: '[is_rt] == "RT"',
              stats: {},
            },
            {
              id: 'a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84',
              explicit_id: false,
              type: 'plugin',
              plugin_type: 'filter',
              config_name: 'mutate',
              stats: {},
            },
            {
              id: 'micdrop',
              explicit_id: true,
              type: 'plugin',
              plugin_type: 'filter',
              config_name: 'drop',
              stats: {},
            },
          ],
          edges: [
            {
              id: '96ae28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f02',
              from: 'log_line_parser',
              to: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
              type: 'plain',
            },
            {
              id: '35591f523dee3465d4c38f20232c56db453a9e4258af5885bf8c79f517690bc5',
              from: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
              to: 'a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84',
              type: 'boolean',
              when: true,
            },
            {
              id: '5591f523dee3465d4c38f20232c56db453a9e4258af5885bf8c79f517690bc53',
              from: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
              to: 'micdrop',
              type: 'boolean',
              when: false,
            },
            {
              id: '6ae28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f029',
              from: 'a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84',
              to: 'micdrop',
              type: 'plain',
            },
          ],
        };
      });

      it('assigns the pipeline stages correctly', () => {
        graph = new Graph();
        graph.update(graphJson);

        expect(graph.getVertices().length).to.be(4);
        expect(graph.edges.length).to.be(4);

        expect(graph.getVertices().filter((v) => !v.pipelineStage).length).to.be(0);
        expect(graph.getVertices().filter((v) => v.pipelineStage === 'input').length).to.be(0);
        expect(graph.hasQueueVertex).to.be(false);
        expect(graph.getVertices().filter((v) => v.pipelineStage === 'filter').length).to.be(4);
        expect(graph.getVertices().filter((v) => v.pipelineStage === 'output').length).to.be(0);
      });
    });

    describe('Pipeline with one output plugin statement and one output if statement', () => {
      beforeEach(() => {
        graphJson = {
          vertices: [
            {
              id: 'es',
              explicit_id: true,
              config_name: 'elasticsearch',
              type: 'plugin',
              plugin_type: 'output',
              stats: {},
            },
            {
              id: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
              explicit_id: false,
              type: 'if',
              condition: '[is_rt] == "RT"',
              stats: {},
            },
            {
              id: 'a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84',
              explicit_id: false,
              type: 'plugin',
              plugin_type: 'output',
              config_name: 'stdout',
              stats: {},
            },
          ],
          edges: [
            {
              id: '35591f523dee3465d4c38f20232c56db453a9e4258af5885bf8c79f517690bc5',
              from: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
              to: 'a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84',
              type: 'boolean',
              when: true,
            },
          ],
        };
      });

      it('assigns the pipeline stages correctly', () => {
        graph = new Graph();
        graph.update(graphJson);

        expect(graph.getVertices().length).to.be(3);
        expect(graph.edges.length).to.be(1);

        expect(graph.getVertices().filter((v) => !v.pipelineStage).length).to.be(0);
        expect(graph.getVertices().filter((v) => v.pipelineStage === 'input').length).to.be(0);
        expect(graph.hasQueueVertex).to.be(false);
        expect(graph.getVertices().filter((v) => v.pipelineStage === 'filter').length).to.be(0);
        expect(graph.getVertices().filter((v) => v.pipelineStage === 'output').length).to.be(3);
      });
    });

    describe('Pipeline with two output plugin statements and one output if statement', () => {
      beforeEach(() => {
        graphJson = {
          vertices: [
            {
              id: 'es',
              explicit_id: true,
              config_name: 'elasticsearch',
              type: 'plugin',
              plugin_type: 'output',
              stats: {},
            },
            {
              id: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
              explicit_id: false,
              type: 'if',
              condition: '[is_rt] == "RT"',
              stats: {},
            },
            {
              id: 'a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84',
              explicit_id: false,
              type: 'plugin',
              plugin_type: 'output',
              config_name: 'stdout',
              stats: {},
            },
            {
              id: 'local_persistent_out',
              explicit_id: true,
              type: 'plugin',
              plugin_type: 'output',
              config_name: 'file',
              stats: {},
            },
          ],
          edges: [
            {
              id: '35591f523dee3465d4c38f20232c56db453a9e4258af5885bf8c79f517690bc5',
              from: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
              to: 'a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84',
              type: 'boolean',
              when: true,
            },
          ],
        };
      });

      it('assigns the pipeline stages correctly', () => {
        graph = new Graph();
        graph.update(graphJson);

        expect(graph.getVertices().length).to.be(4);
        expect(graph.edges.length).to.be(1);

        expect(graph.getVertices().filter((v) => !v.pipelineStage).length).to.be(0);
        expect(graph.getVertices().filter((v) => v.pipelineStage === 'input').length).to.be(0);
        expect(graph.hasQueueVertex).to.be(false);
        expect(graph.getVertices().filter((v) => v.pipelineStage === 'filter').length).to.be(0);
        expect(graph.getVertices().filter((v) => v.pipelineStage === 'output').length).to.be(4);
      });
    });

    describe('Complex pipeline', () => {
      beforeEach(() => {
        graphJson = {
          vertices: [
            {
              id: 'tweet_harvester',
              explicit_id: true,
              type: 'plugin',
              plugin_type: 'input',
              config_name: 'twitter',
              stats: {},
            },
            {
              id: '296ae28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f0',
              explicit_id: false,
              type: 'plugin',
              plugin_type: 'input',
              config_name: 'stdin',
              stats: {},
            },
            {
              id: '__QUEUE__',
              explicit_id: false,
              type: 'queue',
              stats: {},
            },
            {
              id: 'log_line_parser',
              explicit_id: true,
              type: 'plugin',
              plugin_type: 'filter',
              config_name: 'grok',
              stats: {},
            },
            {
              id: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
              explicit_id: false,
              type: 'if',
              condition: '[is_rt] == "RT"',
              stats: {},
            },
            {
              id: 'mutant',
              explicit_id: false,
              type: 'plugin',
              plugin_type: 'filter',
              config_name: 'mutate',
              stats: {},
            },
            {
              id: 'es',
              explicit_id: true,
              config_name: 'elasticsearch',
              type: 'plugin',
              plugin_type: 'output',
              stats: {},
            },
            {
              id: '90f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84a8',
              explicit_id: false,
              type: 'if',
              condition: '[is_rt] == "RT"',
              stats: {},
            },
            {
              id: 'a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84',
              explicit_id: false,
              type: 'plugin',
              plugin_type: 'output',
              config_name: 'stdout',
              stats: {},
            },
            {
              id: 'local_persistent_out',
              explicit_id: true,
              type: 'plugin',
              plugin_type: 'output',
              config_name: 'file',
              stats: {},
            },
          ],
          edges: [
            {
              id: '0296ae28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f',
              from: 'tweet_harvester',
              to: '__QUEUE__',
              type: 'plain',
            },
            {
              id: '96ae28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f02',
              from: '296ae28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f0',
              to: '__QUEUE__',
              type: 'plain',
            },
            {
              id: '6ae28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f029',
              from: '__QUEUE__',
              to: 'log_line_parser',
              type: 'plain',
            },
            {
              id: 'ae28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f0296',
              from: 'log_line_parser',
              to: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
              type: 'plain',
            },
            {
              id: 'e28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f0296a',
              from: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
              to: 'mutant',
              type: 'boolean',
              when: true,
            },
            {
              id: '28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f0296ae',
              from: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
              to: 'es',
              type: 'boolean',
              when: false,
            },
            {
              id: '8a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f0296ae2',
              from: 'mutant',
              to: 'es',
              type: 'plain',
            },
            {
              id: 'a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f0296ae28',
              from: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
              to: '90f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84a8',
              type: 'boolean',
              when: false,
            },
            {
              id: '1c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f0296ae28a1',
              from: 'mutant',
              to: '90f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84a8',
              type: 'plain',
            },
            {
              id: 'c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f0296ae28a11',
              from: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
              to: 'local_persistent_out',
              type: 'boolean',
              when: false,
            },
            {
              id: '3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f0296ae28a11c',
              from: 'mutant',
              to: 'local_persistent_out',
              type: 'plain',
            },
            {
              id: '35591f523dee3465d4c38f20232c56db453a9e4258af5885bf8c79f517690bc5',
              from: '90f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84a8',
              to: 'a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84',
              type: 'boolean',
              when: true,
            },
          ],
        };
      });

      it('assigns the pipeline stages correctly', () => {
        graph = new Graph();
        graph.update(graphJson);

        expect(graph.getVertices().length).to.be(10);
        expect(graph.edges.length).to.be(12);

        expect(graph.getVertices().filter((v) => !v.pipelineStage).length).to.be(1);
        expect(graph.getVertices().filter((v) => v.pipelineStage === 'input').length).to.be(2);
        expect(graph.hasQueueVertex).to.be(true);
        expect(graph.getVertices().filter((v) => v.pipelineStage === 'filter').length).to.be(3);
        expect(graph.getVertices().filter((v) => v.pipelineStage === 'output').length).to.be(4);
      });
    });

    describe('Pipeline with if-else statements', () => {
      beforeEach(() => {
        graphJson = {
          vertices: [
            {
              id: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
              explicit_id: false,
              type: 'if',
              condition: '[is_rt] == "RT"',
              stats: {},
            },
            {
              id: 'a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84',
              explicit_id: false,
              type: 'plugin',
              plugin_type: 'filter',
              config_name: 'mutate',
              stats: {},
            },
            {
              id: 'micdrop',
              explicit_id: true,
              type: 'plugin',
              plugin_type: 'filter',
              config_name: 'drop',
              stats: {},
            },
          ],
          edges: [
            {
              id: '35591f523dee3465d4c38f20232c56db453a9e4258af5885bf8c79f517690bc5',
              from: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
              to: 'a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84',
              type: 'boolean',
              when: true,
            },
            {
              id: '5591f523dee3465d4c38f20232c56db453a9e4258af5885bf8c79f517690bc53',
              from: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
              to: 'micdrop',
              type: 'boolean',
              when: false,
            },
          ],
        };
      });

      it('assigns the pipeline stages correctly', () => {
        graph = new Graph();
        graph.update(graphJson);

        expect(graph.getVertices().length).to.be(3);
        expect(graph.edges.length).to.be(2);

        expect(graph.getVertices().filter((v) => !v.pipelineStage).length).to.be(0);
        expect(graph.getVertices().filter((v) => v.pipelineStage === 'input').length).to.be(0);
        expect(graph.hasQueueVertex).to.be(false);
        expect(graph.getVertices().filter((v) => v.pipelineStage === 'filter').length).to.be(3);
        expect(graph.getVertices().filter((v) => v.pipelineStage === 'output').length).to.be(0);
      });
    });

    describe('Pipeline with if having two true statements', () => {
      beforeEach(() => {
        graphJson = {
          vertices: [
            {
              id: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
              explicit_id: false,
              type: 'if',
              condition: '[is_rt] == "RT"',
              stats: {},
            },
            {
              id: 'a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84',
              explicit_id: false,
              type: 'plugin',
              plugin_type: 'filter',
              config_name: 'mutate',
              stats: {},
            },
            {
              id: 'micdrop',
              explicit_id: true,
              type: 'plugin',
              plugin_type: 'filter',
              config_name: 'drop',
              stats: {},
            },
          ],
          edges: [
            {
              id: '35591f523dee3465d4c38f20232c56db453a9e4258af5885bf8c79f517690bc5',
              from: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
              to: 'a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84',
              type: 'boolean',
              when: true,
            },
            {
              id: '5591f523dee3465d4c38f20232c56db453a9e4258af5885bf8c79f517690bc53',
              from: 'a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84',
              to: 'micdrop',
              type: 'plain',
            },
          ],
        };
      });

      it('assigns the pipeline stages correctly', () => {
        graph = new Graph();
        graph.update(graphJson);

        expect(graph.getVertices().length).to.be(3);
        expect(graph.edges.length).to.be(2);

        expect(graph.getVertices().filter((v) => !v.pipelineStage).length).to.be(0);
        expect(graph.getVertices().filter((v) => v.pipelineStage === 'input').length).to.be(0);
        expect(graph.hasQueueVertex).to.be(false);
        expect(graph.getVertices().filter((v) => v.pipelineStage === 'filter').length).to.be(3);
        expect(graph.getVertices().filter((v) => v.pipelineStage === 'output').length).to.be(0);
      });
    });

    describe('Pipeline with nested ifs', () => {
      beforeEach(() => {
        graphJson = {
          vertices: [
            {
              id: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
              explicit_id: false,
              type: 'if',
              condition: '[is_rt] == "RT"',
              stats: {},
            },
            {
              id: 'a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84',
              explicit_id: false,
              type: 'if',
              condition: '[has_image] == true',
              stats: {},
            },
            {
              id: 'micdrop',
              explicit_id: true,
              type: 'plugin',
              plugin_type: 'filter',
              config_name: 'drop',
              stats: {},
            },
          ],
          edges: [
            {
              id: '35591f523dee3465d4c38f20232c56db453a9e4258af5885bf8c79f517690bc5',
              from: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
              to: 'a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84',
              type: 'boolean',
              when: true,
            },
            {
              id: '5591f523dee3465d4c38f20232c56db453a9e4258af5885bf8c79f517690bc53',
              from: 'a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84',
              to: 'micdrop',
              type: 'boolean',
              when: true,
            },
          ],
        };
      });

      it('assigns the pipeline stages correctly', () => {
        graph = new Graph();
        graph.update(graphJson);

        expect(graph.getVertices().length).to.be(3);
        expect(graph.edges.length).to.be(2);

        expect(graph.getVertices().filter((v) => !v.pipelineStage).length).to.be(0);
        expect(graph.getVertices().filter((v) => v.pipelineStage === 'input').length).to.be(0);
        expect(graph.hasQueueVertex).to.be(false);
        expect(graph.getVertices().filter((v) => v.pipelineStage === 'filter').length).to.be(3);
        expect(graph.getVertices().filter((v) => v.pipelineStage === 'output').length).to.be(0);
      });
    });
  });
});
