/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { Pipeline } from '../';
import { Graph } from '../../graph';
import { IfStatement } from '../if_statement';
import { PluginStatement } from '../plugin_statement';
import { Queue } from '../queue';

describe('Pipeline class', () => {
  let graph;

  describe('Pipeline with no statements', () => {
    beforeEach(() => {
      graph = new Graph();
      graph.update({
        vertices: [],
        edges: []
      });
    });

    it('fromPipelineGraph parses the pipelineGraph correctly', () => {
      const pipeline = Pipeline.fromPipelineGraph(graph);
      expect(pipeline.inputStatements.length).to.be(0);
      expect(pipeline.filterStatements.length).to.be(0);
      expect(pipeline.outputStatements.length).to.be(0);
      expect(pipeline.queue).to.be(null);
    });
  });

  describe('Pipeline with one input plugin statement', () => {
    beforeEach(() => {
      graph = new Graph();
      graph.update({
        vertices: [
          {
            id: 'tweet_harvester',
            explicit_id: true,
            type: 'plugin',
            plugin_type: 'input',
            config_name: 'twitter',
            stats: {}
          },
          {
            id: '__QUEUE__',
            explicit_id: false,
            type: 'queue',
            stats: {}
          }
        ],
        edges: [
          {
            id: '0296ae28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f',
            from: 'tweet_harvester',
            to: '__QUEUE__',
            type: 'plain'
          }
        ]
      });
    });

    it('fromPipelineGraph parses the pipelineGraph correctly', () => {
      const pipeline = Pipeline.fromPipelineGraph(graph);
      expect(pipeline.inputStatements.length).to.be(1);
      expect(pipeline.filterStatements.length).to.be(0);
      expect(pipeline.outputStatements.length).to.be(0);
      expect(pipeline.queue).not.to.be(null);

      expect(pipeline.inputStatements[0]).to.be.a(PluginStatement);
    });

    it('fromPipelineGraph parses Queue and adds it to Pipeline', () => {
      const pipeline = Pipeline.fromPipelineGraph(graph);

      const { queue } = pipeline;

      expect(queue).to.be.a(Queue);
      expect(queue.id).to.equal('__QUEUE__');
      expect(queue.hasExplicitId).to.equal(false);
      expect(queue.stats).to.be.a(Object);
      expect(Object.keys(queue.stats).length).to.be(0);
      expect(queue.meta).to.be(undefined);
    });
  });

  describe('Pipeline with one filter plugin statement', () => {
    beforeEach(() => {
      graph = new Graph();
      graph.update({
        vertices: [
          {
            id: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
            explicit_id: false,
            type: 'plugin',
            plugin_type: 'filter',
            config_name: 'grok',
            stats: {}
          }
        ],
        edges: []
      });
    });

    it('fromPipelineGraph parses the pipelineGraph correctly', () => {
      const pipeline = Pipeline.fromPipelineGraph(graph);
      expect(pipeline.inputStatements.length).to.be(0);
      expect(pipeline.filterStatements.length).to.be(1);
      expect(pipeline.outputStatements.length).to.be(0);
      expect(pipeline.queue).to.be(null);

      expect(pipeline.filterStatements[0]).to.be.a(PluginStatement);
    });
  });

  describe('Pipeline with one output plugin statement', () => {
    beforeEach(() => {
      graph = new Graph();
      graph.update({
        vertices: [
          {
            id: 'es',
            explicit_id: true,
            config_name: 'elasticsearch',
            type: 'plugin',
            plugin_type: 'output',
            stats: {}
          }
        ],
        edges: []
      });
    });

    it('fromPipelineGraph parses the pipelineGraph correctly', () => {
      const pipeline = Pipeline.fromPipelineGraph(graph);
      expect(pipeline.inputStatements.length).to.be(0);
      expect(pipeline.filterStatements.length).to.be(0);
      expect(pipeline.outputStatements.length).to.be(1);
      expect(pipeline.queue).to.be(null);

      expect(pipeline.outputStatements[0]).to.be.a(PluginStatement);
    });
  });

  describe('Pipeline with one input plugin statement and one filter plugin statement', () => {
    beforeEach(() => {
      graph = new Graph();
      graph.update({
        vertices: [
          {
            id: 'tweet_harvester',
            explicit_id: true,
            type: 'plugin',
            plugin_type: 'input',
            config_name: 'twitter',
            stats: {}
          },
          {
            id: '__QUEUE__',
            explicit_id: false,
            type: 'queue',
            stats: {}
          },
          {
            id: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
            explicit_id: false,
            type: 'plugin',
            plugin_type: 'filter',
            config_name: 'grok',
            stats: {}
          }
        ],
        edges: [
          {
            id: '0296ae28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f',
            from: 'tweet_harvester',
            to: '__QUEUE__',
            type: 'plain'
          },
          {
            id: '296ae28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f0',
            from: '__QUEUE__',
            to: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
            type: 'plain'
          }
        ]
      });
    });

    it('fromPipelineGraph parses the pipelineGraph correctly', () => {
      const pipeline = Pipeline.fromPipelineGraph(graph);
      expect(pipeline.inputStatements.length).to.be(1);
      expect(pipeline.filterStatements.length).to.be(1);
      expect(pipeline.outputStatements.length).to.be(0);
      expect(pipeline.queue).to.not.be(null);

      expect(pipeline.inputStatements[0]).to.be.a(PluginStatement);
      expect(pipeline.filterStatements[0]).to.be.a(PluginStatement);
    });
  });

  describe('Pipeline with one input plugin statement and one output plugin statement', () => {
    beforeEach(() => {
      graph = new Graph();
      graph.update({
        vertices: [
          {
            id: 'tweet_harvester',
            explicit_id: true,
            type: 'plugin',
            plugin_type: 'input',
            config_name: 'twitter',
            stats: {}
          },
          {
            id: '__QUEUE__',
            explicit_id: false,
            type: 'queue',
            stats: {}
          },
          {
            id: 'es',
            explicit_id: true,
            config_name: 'elasticsearch',
            type: 'plugin',
            plugin_type: 'output',
            stats: {}
          }
        ],
        edges: [
          {
            id: '0296ae28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f',
            from: 'tweet_harvester',
            to: '__QUEUE__',
            type: 'plain'
          },
          {
            id: '296ae28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f0',
            from: '__QUEUE__',
            to: 'es',
            type: 'plain'
          }
        ]
      });
    });

    it('fromPipelineGraph parses the pipelineGraph correctly', () => {
      const pipeline = Pipeline.fromPipelineGraph(graph);
      expect(pipeline.inputStatements.length).to.be(1);
      expect(pipeline.filterStatements.length).to.be(0);
      expect(pipeline.outputStatements.length).to.be(1);
      expect(pipeline.queue).to.not.be(null);

      expect(pipeline.inputStatements[0]).to.be.a(PluginStatement);
      expect(pipeline.outputStatements[0]).to.be.a(PluginStatement);
    });
  });

  describe('Pipeline with one filter plugin statement and one output plugin statement', () => {
    beforeEach(() => {
      graph = new Graph();
      graph.update({
        vertices: [
          {
            id: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
            explicit_id: false,
            type: 'plugin',
            plugin_type: 'filter',
            config_name: 'grok',
            stats: {}
          },
          {
            id: 'es',
            explicit_id: true,
            config_name: 'elasticsearch',
            type: 'plugin',
            plugin_type: 'output',
            stats: {}
          }
        ],
        edges: [
          {
            id: '35591f523dee3465d4c38f20232c56db453a9e4258af5885bf8c79f517690bc5',
            from: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
            to: 'es',
            type: 'plain'
          }
        ]
      });
    });

    it('fromPipelineGraph parses the pipelineGraph correctly', () => {
      const pipeline = Pipeline.fromPipelineGraph(graph);
      expect(pipeline.inputStatements.length).to.be(0);
      expect(pipeline.filterStatements.length).to.be(1);
      expect(pipeline.outputStatements.length).to.be(1);
      expect(pipeline.queue).to.be(null);

      expect(pipeline.filterStatements[0]).to.be.a(PluginStatement);
      expect(pipeline.outputStatements[0]).to.be.a(PluginStatement);
    });
  });

  describe('Pipeline with one input plugin statement, one filter plugin statement, and one output plugin statement', () => {
    beforeEach(() => {
      graph = new Graph();
      graph.update({
        vertices: [
          {
            id: 'tweet_harvester',
            explicit_id: true,
            type: 'plugin',
            plugin_type: 'input',
            config_name: 'twitter',
            stats: {}
          },
          {
            id: '__QUEUE__',
            explicit_id: false,
            type: 'queue',
            stats: {}
          },
          {
            id: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
            explicit_id: false,
            type: 'plugin',
            plugin_type: 'filter',
            config_name: 'grok',
            stats: {}
          },
          {
            id: 'es',
            explicit_id: true,
            config_name: 'elasticsearch',
            type: 'plugin',
            plugin_type: 'output',
            stats: {}
          }
        ],
        edges: [
          {
            id: '0296ae28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f',
            from: 'tweet_harvester',
            to: '__QUEUE__',
            type: 'plain'
          },
          {
            id: '296ae28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f0',
            from: '__QUEUE__',
            to: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
            type: 'plain'
          },
          {
            id: '35591f523dee3465d4c38f20232c56db453a9e4258af5885bf8c79f517690bc5',
            from: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
            to: 'es',
            type: 'plain'
          }
        ]
      });
    });

    it('fromPipelineGraph parses the pipelineGraph correctly', () => {
      const pipeline = Pipeline.fromPipelineGraph(graph);
      expect(pipeline.inputStatements.length).to.be(1);
      expect(pipeline.filterStatements.length).to.be(1);
      expect(pipeline.outputStatements.length).to.be(1);
      expect(pipeline.queue).to.not.be(null);

      expect(pipeline.inputStatements[0]).to.be.a(PluginStatement);
      expect(pipeline.filterStatements[0]).to.be.a(PluginStatement);
      expect(pipeline.outputStatements[0]).to.be.a(PluginStatement);
      expect(pipeline.queue).to.be.a(Queue);
    });
  });

  describe('Pipeline with one filter if statement', () => {
    beforeEach(() => {
      graph = new Graph();
      graph.update({
        vertices: [
          {
            id: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
            explicit_id: false,
            type: 'if',
            condition: '[is_rt] == "RT"',
            stats: {}
          },
          {
            id: 'log_line_parser',
            explicit_id: true,
            config_name: 'grok',
            type: 'plugin',
            plugin_type: 'filter',
            stats: {}
          }
        ],
        edges: [
          {
            id: '35591f523dee3465d4c38f20232c56db453a9e4258af5885bf8c79f517690bc5',
            from: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
            to: 'log_line_parser',
            type: 'boolean',
            when: true
          }
        ]
      });
    });

    it('fromPipelineGraph parses the pipelineGraph correctly', () => {
      const pipeline = Pipeline.fromPipelineGraph(graph);
      expect(pipeline.inputStatements.length).to.be(0);
      expect(pipeline.filterStatements.length).to.be(1);
      expect(pipeline.outputStatements.length).to.be(0);
      expect(pipeline.queue).to.be(null);

      const ifStatement = pipeline.filterStatements[0];
      expect(ifStatement).to.be.a(IfStatement);
      expect(ifStatement.trueStatements.length).to.be(1);
      expect(ifStatement.trueStatements[0]).to.be.a(PluginStatement);
    });
  });

  describe('Pipeline with one output if statement', () => {
    beforeEach(() => {
      graph = new Graph();
      graph.update({
        vertices: [
          {
            id: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
            explicit_id: false,
            type: 'if',
            condition: '[is_rt] == "RT"',
            stats: {}
          },
          {
            id: 'es',
            explicit_id: true,
            config_name: 'elasticsearch',
            type: 'plugin',
            plugin_type: 'output',
            stats: {}
          }
        ],
        edges: [
          {
            id: '35591f523dee3465d4c38f20232c56db453a9e4258af5885bf8c79f517690bc5',
            from: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
            to: 'es',
            type: 'boolean',
            when: true
          }
        ]
      });
    });

    it('fromPipelineGraph parses the pipelineGraph correctly', () => {
      const pipeline = Pipeline.fromPipelineGraph(graph);
      expect(pipeline.inputStatements.length).to.be(0);
      expect(pipeline.filterStatements.length).to.be(0);
      expect(pipeline.outputStatements.length).to.be(1);
      expect(pipeline.queue).to.be(null);

      const ifStatement = pipeline.outputStatements[0];
      expect(ifStatement).to.be.a(IfStatement);
      expect(ifStatement.trueStatements.length).to.be(1);
      expect(ifStatement.trueStatements[0]).to.be.a(PluginStatement);
    });
  });

  describe('Pipeline with one input plugin statement and one filter if statement', () => {
    beforeEach(() => {
      graph = new Graph();
      graph.update({
        vertices: [
          {
            id: 'tweet_harvester',
            explicit_id: true,
            type: 'plugin',
            plugin_type: 'input',
            config_name: 'twitter',
            stats: {}
          },
          {
            id: '__QUEUE__',
            explicit_id: false,
            type: 'queue',
            stats: {}
          },
          {
            id: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
            explicit_id: false,
            type: 'if',
            condition: '[is_rt] == "RT"',
            stats: {}
          },
          {
            id: 'log_line_parser',
            explicit_id: true,
            config_name: 'grok',
            type: 'plugin',
            plugin_type: 'filter',
            stats: {}
          }
        ],
        edges: [
          {
            id: '0296ae28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f',
            from: 'tweet_harvester',
            to: '__QUEUE__',
            type: 'plain'
          },
          {
            id: '296ae28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f0',
            from: '__QUEUE__',
            to: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
            type: 'plain'
          },
          {
            id: '35591f523dee3465d4c38f20232c56db453a9e4258af5885bf8c79f517690bc5',
            from: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
            to: 'log_line_parser',
            type: 'boolean',
            when: true
          }
        ]
      });
    });

    it('fromPipelineGraph parses the pipelineGraph correctly', () => {
      const pipeline = Pipeline.fromPipelineGraph(graph);
      expect(pipeline.inputStatements.length).to.be(1);
      expect(pipeline.filterStatements.length).to.be(1);
      expect(pipeline.outputStatements.length).to.be(0);
      expect(pipeline.queue).to.not.be(null);

      expect(pipeline.inputStatements[0]).to.be.a(PluginStatement);
      const ifStatement = pipeline.filterStatements[0];
      expect(ifStatement).to.be.a(IfStatement);
      expect(ifStatement.trueStatements.length).to.be(1);
      expect(ifStatement.trueStatements[0]).to.be.a(PluginStatement);
    });
  });

  describe('Pipeline with one input plugin statement, one filter if statement, and one output if statement', () => {
    beforeEach(() => {
      graph = new Graph();
      graph.update({
        vertices: [
          {
            id: 'tweet_harvester',
            explicit_id: true,
            type: 'plugin',
            plugin_type: 'input',
            config_name: 'twitter',
            stats: {}
          },
          {
            id: '__QUEUE__',
            explicit_id: false,
            type: 'queue',
            stats: {}
          },
          {
            id: 'a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84',
            explicit_id: false,
            type: 'if',
            condition: '[is_rt] == "RT"',
            stats: {}
          },
          {
            id: 'log_line_parser',
            explicit_id: true,
            config_name: 'grok',
            type: 'plugin',
            plugin_type: 'filter',
            stats: {}
          },
          {
            id: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
            explicit_id: false,
            type: 'if',
            condition: '[is_rt] == "RT"',
            stats: {}
          },
          {
            id: 'es',
            explicit_id: true,
            config_name: 'elasticsearch',
            type: 'plugin',
            plugin_type: 'output',
            stats: {}
          }
        ],
        edges: [
          {
            id: '0296ae28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f',
            from: 'tweet_harvester',
            to: '__QUEUE__',
            type: 'plain'
          },
          {
            id: '296ae28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f0',
            from: '__QUEUE__',
            to: 'a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84',
            type: 'plain'
          },
          {
            id: '96ae28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f02',
            from: 'a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84',
            to: 'log_line_parser',
            type: 'boolean',
            when: true
          },
          {
            id: '6ae28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f029',
            from: 'a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84',
            to: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
            type: 'boolean',
            when: false
          },
          {
            id: 'ae28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f0296',
            from: 'log_line_parser',
            to: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
            type: 'plain'
          },
          {
            id: '35591f523dee3465d4c38f20232c56db453a9e4258af5885bf8c79f517690bc5',
            from: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
            to: 'es',
            type: 'boolean',
            when: true
          }
        ]
      });
    });

    it('fromPipelineGraph parses the pipelineGraph correctly', () => {
      const pipeline = Pipeline.fromPipelineGraph(graph);
      expect(pipeline.inputStatements.length).to.be(1);
      expect(pipeline.filterStatements.length).to.be(1);
      expect(pipeline.outputStatements.length).to.be(1);
      expect(pipeline.queue).to.not.be(null);

      expect(pipeline.inputStatements[0]).to.be.a(PluginStatement);

      const filterIfStatement = pipeline.filterStatements[0];
      expect(filterIfStatement).to.be.a(IfStatement);
      expect(filterIfStatement.trueStatements.length).to.be(1);
      expect(filterIfStatement.trueStatements[0]).to.be.a(PluginStatement);

      const outputIfStatement = pipeline.filterStatements[0];
      expect(outputIfStatement).to.be.a(IfStatement);
      expect(outputIfStatement.trueStatements.length).to.be(1);
      expect(outputIfStatement.trueStatements[0]).to.be.a(PluginStatement);
    });
  });

  describe('Pipeline with two input plugin statements', () => {
    beforeEach(() => {
      graph = new Graph();
      graph.update({
        vertices: [
          {
            id: 'tweet_harvester',
            explicit_id: true,
            type: 'plugin',
            plugin_type: 'input',
            config_name: 'twitter',
            stats: {}
          },
          {
            id: '296ae28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f0',
            explicit_id: false,
            type: 'plugin',
            plugin_type: 'input',
            config_name: 'stdin',
            stats: {}
          },
          {
            id: '__QUEUE__',
            explicit_id: false,
            type: 'queue',
            stats: {}
          }
        ],
        edges: [
          {
            id: '0296ae28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f',
            from: 'tweet_harvester',
            to: '__QUEUE__',
            type: 'plain'
          },
          {
            id: '96ae28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f02',
            from: '296ae28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f0',
            to: '__QUEUE__',
            type: 'plain'
          }
        ]
      });
    });

    it('fromPipelineGraph parses the pipelineGraph correctly', () => {
      const pipeline = Pipeline.fromPipelineGraph(graph);
      expect(pipeline.inputStatements.length).to.be(2);
      expect(pipeline.filterStatements.length).to.be(0);
      expect(pipeline.outputStatements.length).to.be(0);
      expect(pipeline.queue).to.not.be(null);

      expect(pipeline.inputStatements[0]).to.be.a(PluginStatement);
      expect(pipeline.inputStatements[0].id).to.be('tweet_harvester');
      expect(pipeline.inputStatements[0].hasExplicitId).to.be(true);
      expect(pipeline.inputStatements[0].pluginType).to.be('input');
      expect(pipeline.inputStatements[0].name).to.be('twitter');

      expect(pipeline.inputStatements[1]).to.be.a(PluginStatement);
      expect(pipeline.inputStatements[1].id).to.be('296ae28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f0');
      expect(pipeline.inputStatements[1].hasExplicitId).to.be(false);
      expect(pipeline.inputStatements[1].pluginType).to.be('input');
      expect(pipeline.inputStatements[1].name).to.be('stdin');
    });
  });

  describe('Pipeline with two filter plugin statements', () => {
    beforeEach(() => {
      graph = new Graph();
      graph.update({
        vertices: [
          {
            id: 'log_line_parser',
            explicit_id: true,
            type: 'plugin',
            plugin_type: 'filter',
            config_name: 'grok',
            stats: {}
          },
          {
            id: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
            explicit_id: false,
            type: 'plugin',
            plugin_type: 'filter',
            config_name: 'mutate',
            stats: {}
          }
        ],
        edges: [
          {
            id: '96ae28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f02',
            from: 'log_line_parser',
            to: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
            type: 'plain'
          }
        ]
      });
    });

    it('fromPipelineGraph parses the pipelineGraph correctly', () => {
      const pipeline = Pipeline.fromPipelineGraph(graph);
      expect(pipeline.inputStatements.length).to.be(0);
      expect(pipeline.filterStatements.length).to.be(2);
      expect(pipeline.outputStatements.length).to.be(0);
      expect(pipeline.queue).to.be(null);

      expect(pipeline.filterStatements[0]).to.be.a(PluginStatement);
      expect(pipeline.filterStatements[0].id).to.be('log_line_parser');
      expect(pipeline.filterStatements[0].hasExplicitId).to.be(true);
      expect(pipeline.filterStatements[0].pluginType).to.be('filter');
      expect(pipeline.filterStatements[0].name).to.be('grok');

      expect(pipeline.filterStatements[1]).to.be.a(PluginStatement);
      expect(pipeline.filterStatements[1].id).to.be('4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8');
      expect(pipeline.filterStatements[1].hasExplicitId).to.be(false);
      expect(pipeline.filterStatements[1].pluginType).to.be('filter');
      expect(pipeline.filterStatements[1].name).to.be('mutate');
    });
  });

  describe('Pipeline with two output plugin statements', () => {
    beforeEach(() => {
      graph = new Graph();
      graph.update({
        vertices: [
          {
            id: 'es',
            explicit_id: true,
            config_name: 'elasticsearch',
            type: 'plugin',
            plugin_type: 'output',
            stats: {}
          },
          {
            id: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
            explicit_id: false,
            type: 'plugin',
            plugin_type: 'output',
            config_name: 'stdout',
            stats: {}
          }
        ],
        edges: []
      });
    });

    it('fromPipelineGraph parses the pipelineGraph correctly', () => {
      const pipeline = Pipeline.fromPipelineGraph(graph);
      expect(pipeline.inputStatements.length).to.be(0);
      expect(pipeline.filterStatements.length).to.be(0);
      expect(pipeline.outputStatements.length).to.be(2);
      expect(pipeline.queue).to.be(null);

      expect(pipeline.outputStatements[0]).to.be.a(PluginStatement);
      expect(pipeline.outputStatements[0].id).to.be('es');
      expect(pipeline.outputStatements[0].hasExplicitId).to.be(true);
      expect(pipeline.outputStatements[0].pluginType).to.be('output');
      expect(pipeline.outputStatements[0].name).to.be('elasticsearch');

      expect(pipeline.outputStatements[1]).to.be.a(PluginStatement);
      expect(pipeline.outputStatements[1].id).to.be('4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8');
      expect(pipeline.outputStatements[1].hasExplicitId).to.be(false);
      expect(pipeline.outputStatements[1].pluginType).to.be('output');
      expect(pipeline.outputStatements[1].name).to.be('stdout');
    });
  });

  describe('Pipeline with one filter plugin statement and one filter if statement', () => {
    beforeEach(() => {
      graph = new Graph();
      graph.update({
        vertices: [
          {
            id: 'log_line_parser',
            explicit_id: true,
            type: 'plugin',
            plugin_type: 'filter',
            config_name: 'grok',
            stats: {}
          },
          {
            id: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
            explicit_id: false,
            type: 'if',
            condition: '[is_rt] == "RT"',
            stats: {}
          },
          {
            id: 'a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84',
            explicit_id: false,
            type: 'plugin',
            plugin_type: 'filter',
            config_name: 'mutate',
            stats: {}
          }
        ],
        edges: [
          {
            id: '96ae28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f02',
            from: 'log_line_parser',
            to: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
            type: 'plain'
          },
          {
            id: '35591f523dee3465d4c38f20232c56db453a9e4258af5885bf8c79f517690bc5',
            from: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
            to: 'a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84',
            type: 'boolean',
            when: true
          }
        ]
      });
    });

    it('fromPipelineGraph parses the pipelineGraph correctly', () => {
      const pipeline = Pipeline.fromPipelineGraph(graph);
      expect(pipeline.inputStatements.length).to.be(0);
      expect(pipeline.filterStatements.length).to.be(2);
      expect(pipeline.outputStatements.length).to.be(0);
      expect(pipeline.queue).to.be(null);

      expect(pipeline.filterStatements[0]).to.be.a(PluginStatement);
      expect(pipeline.filterStatements[0].id).to.be('log_line_parser');
      expect(pipeline.filterStatements[0].hasExplicitId).to.be(true);
      expect(pipeline.filterStatements[0].pluginType).to.be('filter');
      expect(pipeline.filterStatements[0].name).to.be('grok');

      const ifStatement = pipeline.filterStatements[1];
      expect(ifStatement).to.be.a(IfStatement);
      expect(ifStatement.id).to.be('4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8');
      expect(ifStatement.hasExplicitId).to.be(false);
      expect(ifStatement.condition).to.be('[is_rt] == "RT"');

      expect(ifStatement.trueStatements[0]).to.be.a(PluginStatement);
    });
  });

  describe('Pipeline with two filter plugin statements and one filter if statement', () => {
    beforeEach(() => {
      graph = new Graph();
      graph.update({
        vertices: [
          {
            id: 'log_line_parser',
            explicit_id: true,
            type: 'plugin',
            plugin_type: 'filter',
            config_name: 'grok',
            stats: {}
          },
          {
            id: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
            explicit_id: false,
            type: 'if',
            condition: '[is_rt] == "RT"',
            stats: {}
          },
          {
            id: 'a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84',
            explicit_id: false,
            type: 'plugin',
            plugin_type: 'filter',
            config_name: 'mutate',
            stats: {}
          },
          {
            id: 'micdrop',
            explicit_id: true,
            type: 'plugin',
            plugin_type: 'filter',
            config_name: 'drop',
            stats: {}
          }
        ],
        edges: [
          {
            id: '96ae28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f02',
            from: 'log_line_parser',
            to: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
            type: 'plain'
          },
          {
            id: '35591f523dee3465d4c38f20232c56db453a9e4258af5885bf8c79f517690bc5',
            from: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
            to: 'a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84',
            type: 'boolean',
            when: true
          },
          {
            id: '5591f523dee3465d4c38f20232c56db453a9e4258af5885bf8c79f517690bc53',
            from: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
            to: 'micdrop',
            type: 'boolean',
            when: false
          },
          {
            id: '6ae28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f029',
            from: 'a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84',
            to: 'micdrop',
            type: 'plain'
          }
        ]
      });
    });

    it('fromPipelineGraph parses the pipelineGraph correctly', () => {
      const pipeline = Pipeline.fromPipelineGraph(graph);
      expect(pipeline.inputStatements.length).to.be(0);
      expect(pipeline.filterStatements.length).to.be(3);
      expect(pipeline.outputStatements.length).to.be(0);
      expect(pipeline.queue).to.be(null);

      expect(pipeline.filterStatements[0]).to.be.a(PluginStatement);
      expect(pipeline.filterStatements[0].id).to.be('log_line_parser');
      expect(pipeline.filterStatements[0].hasExplicitId).to.be(true);
      expect(pipeline.filterStatements[0].pluginType).to.be('filter');
      expect(pipeline.filterStatements[0].name).to.be('grok');

      const ifStatement = pipeline.filterStatements[1];
      expect(ifStatement).to.be.a(IfStatement);
      expect(ifStatement.id).to.be('4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8');
      expect(ifStatement.hasExplicitId).to.be(false);
      expect(ifStatement.condition).to.be('[is_rt] == "RT"');
      expect(ifStatement.trueStatements[0]).to.be.a(PluginStatement);

      expect(pipeline.filterStatements[2]).to.be.a(PluginStatement);
      expect(pipeline.filterStatements[2].id).to.be('micdrop');
      expect(pipeline.filterStatements[2].hasExplicitId).to.be(true);
      expect(pipeline.filterStatements[2].pluginType).to.be('filter');
      expect(pipeline.filterStatements[2].name).to.be('drop');
    });
  });

  describe('Pipeline with one output plugin statement and one output if statement', () => {
    beforeEach(() => {
      graph = new Graph();
      graph.update({
        vertices: [
          {
            id: 'es',
            explicit_id: true,
            config_name: 'elasticsearch',
            type: 'plugin',
            plugin_type: 'output',
            stats: {}
          },
          {
            id: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
            explicit_id: false,
            type: 'if',
            condition: '[is_rt] == "RT"',
            stats: {}
          },
          {
            id: 'a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84',
            explicit_id: false,
            type: 'plugin',
            plugin_type: 'output',
            config_name: 'stdout',
            stats: {}
          }
        ],
        edges: [
          {
            id: '35591f523dee3465d4c38f20232c56db453a9e4258af5885bf8c79f517690bc5',
            from: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
            to: 'a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84',
            type: 'boolean',
            when: true
          }
        ]
      });

      it('fromPipelineGraph parses the pipelineGraph correctly', () => {
        const pipeline = Pipeline.fromPipelineGraph(graph);
        expect(pipeline.inputStatements.length).to.be(0);
        expect(pipeline.filterStatements.length).to.be(0);
        expect(pipeline.outputStatements.length).to.be(2);
        expect(pipeline.queue).to.be(null);

        expect(pipeline.outputStatements[0]).to.be.a(PluginStatement);
        expect(pipeline.outputStatements[0].id).to.be('es');
        expect(pipeline.outputStatements[0].hasExplicitId).to.be(true);
        expect(pipeline.outputStatements[0].pluginType).to.be('output');
        expect(pipeline.outputStatements[0].name).to.be('elasticsearch');

        const ifStatement = pipeline.outputStatements[1];
        expect(ifStatement).to.be.a(IfStatement);
        expect(ifStatement.id).to.be('4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8');
        expect(ifStatement.hasExplicitId).to.be(false);
        expect(ifStatement.condition).to.be('[is_rt] == "RT"');
        expect(ifStatement.trueStatements[0]).to.be.a(PluginStatement);
      });
    });
  });

  describe('Pipeline with two output plugin statements and one output if statement', () => {
    beforeEach(() => {
      graph = new Graph();
      graph.update({
        vertices: [
          {
            id: 'es',
            explicit_id: true,
            config_name: 'elasticsearch',
            type: 'plugin',
            plugin_type: 'output',
            stats: {}
          },
          {
            id: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
            explicit_id: false,
            type: 'if',
            condition: '[is_rt] == "RT"',
            stats: {}
          },
          {
            id: 'a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84',
            explicit_id: false,
            type: 'plugin',
            plugin_type: 'output',
            config_name: 'stdout',
            stats: {}
          },
          {
            id: 'local_persistent_out',
            explicit_id: true,
            type: 'plugin',
            plugin_type: 'output',
            config_name: 'file',
            stats: {}
          }
        ],
        edges: [
          {
            id: '35591f523dee3465d4c38f20232c56db453a9e4258af5885bf8c79f517690bc5',
            from: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
            to: 'a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84',
            type: 'boolean',
            when: true
          }
        ]
      });
    });

    it('fromPipelineGraph parses the pipelineGraph correctly', () => {
      const pipeline = Pipeline.fromPipelineGraph(graph);
      expect(pipeline.inputStatements.length).to.be(0);
      expect(pipeline.filterStatements.length).to.be(0);
      expect(pipeline.outputStatements.length).to.be(3);
      expect(pipeline.queue).to.be(null);

      expect(pipeline.outputStatements[0]).to.be.a(PluginStatement);
      expect(pipeline.outputStatements[0].id).to.be('es');
      expect(pipeline.outputStatements[0].hasExplicitId).to.be(true);
      expect(pipeline.outputStatements[0].pluginType).to.be('output');
      expect(pipeline.outputStatements[0].name).to.be('elasticsearch');

      const ifStatement = pipeline.outputStatements[1];
      expect(ifStatement).to.be.a(IfStatement);
      expect(ifStatement.id).to.be('4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8');
      expect(ifStatement.hasExplicitId).to.be(false);
      expect(ifStatement.condition).to.be('[is_rt] == "RT"');
      expect(ifStatement.trueStatements[0]).to.be.a(PluginStatement);

      expect(pipeline.outputStatements[2]).to.be.a(PluginStatement);
      expect(pipeline.outputStatements[2].id).to.be('local_persistent_out');
      expect(pipeline.outputStatements[2].hasExplicitId).to.be(true);
      expect(pipeline.outputStatements[2].pluginType).to.be('output');
      expect(pipeline.outputStatements[2].name).to.be('file');
    });
  });

  describe('Complex pipeline', () => {
    beforeEach(() => {
      graph = new Graph();
      graph.update({
        vertices: [
          {
            id: 'tweet_harvester',
            explicit_id: true,
            type: 'plugin',
            plugin_type: 'input',
            config_name: 'twitter',
            stats: {}
          },
          {
            id: '296ae28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f0',
            explicit_id: false,
            type: 'plugin',
            plugin_type: 'input',
            config_name: 'stdin',
            stats: {}
          },
          {
            id: '__QUEUE__',
            explicit_id: false,
            type: 'queue',
            stats: {}
          },
          {
            id: 'log_line_parser',
            explicit_id: true,
            type: 'plugin',
            plugin_type: 'filter',
            config_name: 'grok',
            stats: {}
          },
          {
            id: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
            explicit_id: false,
            type: 'if',
            condition: '[is_rt] == "RT"',
            stats: {}
          },
          {
            id: 'mutant',
            explicit_id: false,
            type: 'plugin',
            plugin_type: 'filter',
            config_name: 'mutate',
            stats: {}
          },
          {
            id: 'es',
            explicit_id: true,
            config_name: 'elasticsearch',
            type: 'plugin',
            plugin_type: 'output',
            stats: {}
          },
          {
            id: '90f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84a8',
            explicit_id: false,
            type: 'if',
            condition: '[is_rt] == "RT"',
            stats: {}
          },
          {
            id: 'a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84',
            explicit_id: false,
            type: 'plugin',
            plugin_type: 'output',
            config_name: 'stdout',
            stats: {}
          },
          {
            id: 'local_persistent_out',
            explicit_id: true,
            type: 'plugin',
            plugin_type: 'output',
            config_name: 'file',
            stats: {}
          }
        ],
        edges: [
          {
            id: '0296ae28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f',
            from: 'tweet_harvester',
            to: '__QUEUE__',
            type: 'plain'
          },
          {
            id: '96ae28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f02',
            from: '296ae28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f0',
            to: '__QUEUE__',
            type: 'plain'
          },
          {
            id: '6ae28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f029',
            from: '__QUEUE__',
            to: 'log_line_parser',
            type: 'plain'
          },
          {
            id: 'ae28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f0296',
            from: 'log_line_parser',
            to: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
            type: 'plain'
          },
          {
            id: 'e28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f0296a',
            from: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
            to: 'mutant',
            type: 'boolean',
            when: true
          },
          {
            id: '28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f0296ae',
            from: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
            to: 'es',
            type: 'boolean',
            when: false
          },
          {
            id: '8a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f0296ae2',
            from: 'mutant',
            to: 'es',
            type: 'plain'
          },
          {
            id: 'a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f0296ae28',
            from: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
            to: '90f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84a8',
            type: 'boolean',
            when: false
          },
          {
            id: '1c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f0296ae28a1',
            from: 'mutant',
            to: '90f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84a8',
            type: 'plain'
          },
          {
            id: 'c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f0296ae28a11',
            from: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
            to: 'local_persistent_out',
            type: 'boolean',
            when: false
          },
          {
            id: 'c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f0296ae28a11',
            from: 'mutant',
            to: 'local_persistent_out',
            type: 'plain'
          },
          {
            id: '35591f523dee3465d4c38f20232c56db453a9e4258af5885bf8c79f517690bc5',
            from: '90f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84a8',
            to: 'a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84',
            type: 'boolean',
            when: true
          }
        ]
      });
    });

    it('fromPipelineGraph parses the pipelineGraph correctly', () => {
      const pipeline = Pipeline.fromPipelineGraph(graph);
      expect(pipeline.inputStatements.length).to.be(2);
      expect(pipeline.filterStatements.length).to.be(2);
      expect(pipeline.outputStatements.length).to.be(3);
      expect(pipeline.queue).to.not.be(null);

      expect(pipeline.inputStatements[0]).to.be.a(PluginStatement);
      expect(pipeline.inputStatements[0].id).to.be('tweet_harvester');
      expect(pipeline.inputStatements[0].hasExplicitId).to.be(true);
      expect(pipeline.inputStatements[0].pluginType).to.be('input');
      expect(pipeline.inputStatements[0].name).to.be('twitter');

      expect(pipeline.inputStatements[1]).to.be.a(PluginStatement);
      expect(pipeline.inputStatements[1].id).to.be('296ae28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f0');
      expect(pipeline.inputStatements[1].hasExplicitId).to.be(false);
      expect(pipeline.inputStatements[1].pluginType).to.be('input');
      expect(pipeline.inputStatements[1].name).to.be('stdin');

      expect(pipeline.filterStatements[0]).to.be.a(PluginStatement);
      expect(pipeline.filterStatements[0].id).to.be('log_line_parser');
      expect(pipeline.filterStatements[0].hasExplicitId).to.be(true);
      expect(pipeline.filterStatements[0].pluginType).to.be('filter');
      expect(pipeline.filterStatements[0].name).to.be('grok');

      const filterIfStatement = pipeline.filterStatements[1];
      expect(filterIfStatement).to.be.a(IfStatement);
      expect(filterIfStatement.id).to.be('4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8');
      expect(filterIfStatement.hasExplicitId).to.be(false);
      expect(filterIfStatement.condition).to.be('[is_rt] == "RT"');
      expect(filterIfStatement.trueStatements[0]).to.be.a(PluginStatement);

      expect(pipeline.outputStatements[0]).to.be.a(PluginStatement);
      expect(pipeline.outputStatements[0].id).to.be('es');
      expect(pipeline.outputStatements[0].hasExplicitId).to.be(true);
      expect(pipeline.outputStatements[0].pluginType).to.be('output');
      expect(pipeline.outputStatements[0].name).to.be('elasticsearch');

      const outputIfStatement = pipeline.outputStatements[1];
      expect(outputIfStatement).to.be.a(IfStatement);
      expect(outputIfStatement.id).to.be('90f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84a8');
      expect(outputIfStatement.hasExplicitId).to.be(false);
      expect(outputIfStatement.condition).to.be('[is_rt] == "RT"');
      expect(outputIfStatement.trueStatements[0]).to.be.a(PluginStatement);

      expect(pipeline.outputStatements[2]).to.be.a(PluginStatement);
      expect(pipeline.outputStatements[2].id).to.be('local_persistent_out');
      expect(pipeline.outputStatements[2].hasExplicitId).to.be(true);
      expect(pipeline.outputStatements[2].pluginType).to.be('output');
      expect(pipeline.outputStatements[2].name).to.be('file');

      expect(pipeline.queue).to.be.a(Queue);
      expect(pipeline.queue.id).to.be('__QUEUE__');
    });
  });

  describe('Pipeline with if-else statements', () => {
    beforeEach(() => {
      graph = new Graph();
      graph.update({
        vertices: [
          {
            id: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
            explicit_id: false,
            type: 'if',
            condition: '[is_rt] == "RT"',
            stats: {}
          },
          {
            id: 'a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84',
            explicit_id: false,
            type: 'plugin',
            plugin_type: 'filter',
            config_name: 'mutate',
            stats: {}
          },
          {
            id: 'micdrop',
            explicit_id: true,
            type: 'plugin',
            plugin_type: 'filter',
            config_name: 'drop',
            stats: {}
          }
        ],
        edges: [
          {
            id: '35591f523dee3465d4c38f20232c56db453a9e4258af5885bf8c79f517690bc5',
            from: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
            to: 'a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84',
            type: 'boolean',
            when: true
          },
          {
            id: '5591f523dee3465d4c38f20232c56db453a9e4258af5885bf8c79f517690bc53',
            from: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
            to: 'micdrop',
            type: 'boolean',
            when: false
          }
        ]
      });
    });

    it('fromPipelineGraph parses the pipelineGraph correctly', () => {
      const pipeline = Pipeline.fromPipelineGraph(graph);
      expect(pipeline.inputStatements.length).to.be(0);
      expect(pipeline.filterStatements.length).to.be(1);
      expect(pipeline.outputStatements.length).to.be(0);
      expect(pipeline.queue).to.be(null);

      const ifStatement = pipeline.filterStatements[0];
      expect(ifStatement).to.be.a(IfStatement);
      expect(ifStatement.id).to.be('4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8');
      expect(ifStatement.hasExplicitId).to.be(false);
      expect(ifStatement.condition).to.be('[is_rt] == "RT"');

      expect(ifStatement.trueStatements[0]).to.be.a(PluginStatement);
      expect(ifStatement.trueStatements[0].id).to.be('a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84');

      expect(ifStatement.elseStatements[0]).to.be.a(PluginStatement);
      expect(ifStatement.elseStatements[0].id).to.be('micdrop');
    });
  });

  describe('Pipeline with if having two true statements', () => {
    beforeEach(() => {
      graph = new Graph();
      graph.update({
        vertices: [
          {
            id: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
            explicit_id: false,
            type: 'if',
            condition: '[is_rt] == "RT"',
            stats: {}
          },
          {
            id: 'a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84',
            explicit_id: false,
            type: 'plugin',
            plugin_type: 'filter',
            config_name: 'mutate',
            stats: {}
          },
          {
            id: 'micdrop',
            explicit_id: true,
            type: 'plugin',
            plugin_type: 'filter',
            config_name: 'drop',
            stats: {}
          }
        ],
        edges: [
          {
            id: '35591f523dee3465d4c38f20232c56db453a9e4258af5885bf8c79f517690bc5',
            from: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
            to: 'a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84',
            type: 'boolean',
            when: true
          },
          {
            id: '5591f523dee3465d4c38f20232c56db453a9e4258af5885bf8c79f517690bc53',
            from: 'a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84',
            to: 'micdrop',
            type: 'plain'
          }
        ]
      });
    });

    it('fromPipelineGraph parses the pipelineGraph correctly', () => {
      const pipeline = Pipeline.fromPipelineGraph(graph);
      expect(pipeline.inputStatements.length).to.be(0);
      expect(pipeline.filterStatements.length).to.be(1);
      expect(pipeline.outputStatements.length).to.be(0);
      expect(pipeline.queue).to.be(null);

      const ifStatement = pipeline.filterStatements[0];
      expect(ifStatement).to.be.a(IfStatement);
      expect(ifStatement.id).to.be('4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8');
      expect(ifStatement.hasExplicitId).to.be(false);
      expect(ifStatement.condition).to.be('[is_rt] == "RT"');

      expect(ifStatement.trueStatements.length).to.be(2);
      expect(ifStatement.trueStatements[0]).to.be.a(PluginStatement);
      expect(ifStatement.trueStatements[0].id).to.be('a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84');
      expect(ifStatement.trueStatements[1]).to.be.a(PluginStatement);
      expect(ifStatement.trueStatements[1].id).to.be('micdrop');

      expect(ifStatement.elseStatements.length).to.be(0);
    });
  });

  describe('Pipeline with if having two else statements', () => {
    beforeEach(() => {
      graph = new Graph();
      graph.update({
        vertices: [
          {
            id: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
            explicit_id: false,
            type: 'if',
            condition: '[is_rt] == "RT"',
            stats: {}
          },
          {
            id: '890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84a',
            explicit_id: false,
            type: 'plugin',
            plugin_type: 'filter',
            config_name: 'grok',
            stats: {}
          },
          {
            id: 'a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84',
            explicit_id: false,
            type: 'plugin',
            plugin_type: 'filter',
            config_name: 'mutate',
            stats: {}
          },
          {
            id: 'micdrop',
            explicit_id: true,
            type: 'plugin',
            plugin_type: 'filter',
            config_name: 'drop',
            stats: {}
          }
        ],
        edges: [
          {
            id: '35591f523dee3465d4c38f20232c56db453a9e4258af5885bf8c79f517690bc5',
            from: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
            to: '890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84a',
            type: 'boolean',
            when: true
          },
          {
            id: '591f523dee3465d4c38f20232c56db453a9e4258af5885bf8c79f517690bc535',
            from: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
            to: 'a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84',
            type: 'boolean',
            when: false
          },
          {
            id: '5591f523dee3465d4c38f20232c56db453a9e4258af5885bf8c79f517690bc53',
            from: 'a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84',
            to: 'micdrop',
            type: 'plain'
          }
        ]
      });
    });

    it('fromPipelineGraph parses the pipelineGraph correctly', () => {
      const pipeline = Pipeline.fromPipelineGraph(graph);
      expect(pipeline.inputStatements.length).to.be(0);
      expect(pipeline.filterStatements.length).to.be(1);
      expect(pipeline.outputStatements.length).to.be(0);
      expect(pipeline.queue).to.be(null);

      const ifStatement = pipeline.filterStatements[0];
      expect(ifStatement).to.be.a(IfStatement);
      expect(ifStatement.id).to.be('4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8');
      expect(ifStatement.hasExplicitId).to.be(false);
      expect(ifStatement.condition).to.be('[is_rt] == "RT"');

      expect(ifStatement.trueStatements.length).to.be(1);
      expect(ifStatement.trueStatements[0]).to.be.a(PluginStatement);
      expect(ifStatement.trueStatements[0].id).to.be('890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84a');

      expect(ifStatement.elseStatements.length).to.be(2);
      expect(ifStatement.elseStatements[0]).to.be.a(PluginStatement);
      expect(ifStatement.elseStatements[0].id).to.be('a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84');
      expect(ifStatement.elseStatements[1]).to.be.a(PluginStatement);
      expect(ifStatement.elseStatements[1].id).to.be('micdrop');
    });
  });

  describe('Pipeline with if having two nested output statements', () => {
    beforeEach(() => {
      graph = new Graph();
      graph.update({
        vertices: [
          {
            id: 'the_if',
            explicit_id: false,
            type: 'if',
            condition: '[is_rt] == "RT"',
            stats: {}
          },
          {
            plugin_type: 'output',
            type: 'plugin',
            config_name: 'stdout',
            id: 'plugin_1',
            meta: {
              source: {
                line: 124,
                protocol: 'str',
                id: 'pipeline',
                column: 5
              }
            },
            explicit_id: false,
            stats: null
          },
          {
            plugin_type: 'output',
            type: 'plugin',
            config_name: 'elasticsearch',
            id: 'plugin_2',
            meta: {
              source: {
                line: 117,
                protocol: 'str',
                id: 'pipeline',
                column: 5
              }
            },
            explicit_id: true,
            stats: null
          },
        ],
        edges: [
          {
            id: '35591f523dee3465d4c38f20232c56db453a9e4258af5885bf8c79f517690bc5',
            from: 'the_if',
            to: 'plugin_1',
            type: 'boolean',
            when: true
          },
          {
            id: '591f523dee3465d4c38f20232c56db453a9e4258af5885bf8c79f517690bc535',
            from: 'the_if',
            to: 'plugin_2',
            type: 'boolean',
            when: true
          }
        ]
      });
    });

    it('has two child statements', () => {
      const pipeline = Pipeline.fromPipelineGraph(graph);

      expect(pipeline.outputStatements.length).to.be(1);
      const { trueStatements } = pipeline.outputStatements[0];
      expect(trueStatements.length).to.be(2);
      expect(trueStatements[0].id).to.be('plugin_1');
      expect(trueStatements[1].id).to.be('plugin_2');
      expect(pipeline.outputStatements[0].elseStatements.length).to.be(0);
    });
  });

  describe('Pipeline with if having two nested else statements', () => {
    beforeEach(() => {
      graph = new Graph();
      graph.update({
        vertices: [
          {
            id: 'the_if',
            explicit_id: false,
            type: 'if',
            condition: '[is_rt] == "RT"',
            stats: {}
          },
          {
            plugin_type: 'output',
            type: 'plugin',
            config_name: 'stdout',
            id: 'plugin_1',
            meta: {
              source: {
                line: 124,
                protocol: 'str',
                id: 'pipeline',
                column: 5
              }
            },
            explicit_id: false,
            stats: null
          },
          {
            plugin_type: 'output',
            type: 'plugin',
            config_name: 'elasticsearch',
            id: 'plugin_2',
            meta: {
              source: {
                line: 117,
                protocol: 'str',
                id: 'pipeline',
                column: 5
              }
            },
            explicit_id: true,
            stats: null
          },
          {
            plugin_type: 'output',
            type: 'plugin',
            config_name: 'stdout',
            id: 'plugin_3',
            meta: {
              source: {
                line: 120,
                protocol: 'str',
                id: 'pipeline',
                column: 5
              }
            },
            explicit_id: false,
            stats: null
          },
        ],
        edges: [
          {
            id: '35591f523dee3465d4c38f20232c56db453a9e4258af5885bf8c79f517690bc5',
            from: 'the_if',
            to: 'plugin_1',
            type: 'boolean',
            when: false
          },
          {
            id: '591f523dee3465d4c38f20232c56db453a9e4258af5885bf8c79f517690bc535',
            from: 'the_if',
            to: 'plugin_2',
            type: 'boolean',
            when: false
          },
          {
            id: '637281923dee3465d4c38f20232c56db453a9e4258af5885bf8c79f517690bc5',
            from: 'the_if',
            to: 'plugin_3',
            type: 'boolean',
            when: true
          }
        ]
      });
    });

    it('has two child else statements', () => {
      const pipeline = Pipeline.fromPipelineGraph(graph);

      expect(pipeline.outputStatements.length).to.be(1);
      const {
        trueStatements,
        elseStatements
      } = pipeline.outputStatements[0];
      expect(trueStatements.length).to.be(1);
      expect(trueStatements[0].id).to.be('plugin_3');
      expect(elseStatements.length).to.be(2);
      expect(elseStatements[0].id).to.be('plugin_1');
      expect(elseStatements[1].id).to.be('plugin_2');
    });
  });

  describe('Pipeline with nested ifs', () => {
    beforeEach(() => {
      graph = new Graph();
      graph.update({
        vertices: [
          {
            id: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
            explicit_id: false,
            type: 'if',
            condition: '[is_rt] == "RT"',
            stats: {}
          },
          {
            id: 'a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84',
            explicit_id: false,
            type: 'if',
            condition: '[has_image] == true',
            stats: {}
          },
          {
            id: 'micdrop',
            explicit_id: true,
            type: 'plugin',
            plugin_type: 'filter',
            config_name: 'drop',
            stats: {}
          }
        ],
        edges: [
          {
            id: '35591f523dee3465d4c38f20232c56db453a9e4258af5885bf8c79f517690bc5',
            from: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
            to: 'a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84',
            type: 'boolean',
            when: true
          },
          {
            id: '5591f523dee3465d4c38f20232c56db453a9e4258af5885bf8c79f517690bc53',
            from: 'a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84',
            to: 'micdrop',
            type: 'boolean',
            when: true
          }
        ]
      });
    });

    it('fromPipelineGraph parses the pipelineGraph correctly', () => {
      const pipeline = Pipeline.fromPipelineGraph(graph);
      expect(pipeline.inputStatements.length).to.be(0);
      expect(pipeline.filterStatements.length).to.be(1);
      expect(pipeline.outputStatements.length).to.be(0);
      expect(pipeline.queue).to.be(null);

      const outerIfStatement = pipeline.filterStatements[0];
      expect(outerIfStatement).to.be.a(IfStatement);
      expect(outerIfStatement.id).to.be('4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8');
      expect(outerIfStatement.hasExplicitId).to.be(false);
      expect(outerIfStatement.condition).to.be('[is_rt] == "RT"');

      const innerIfStatement = outerIfStatement.trueStatements[0];
      expect(innerIfStatement).to.be.a(IfStatement);
      expect(innerIfStatement.id).to.be('a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84');
      expect(innerIfStatement.hasExplicitId).to.be(false);
      expect(innerIfStatement.condition).to.be('[has_image] == true');

      expect(innerIfStatement.trueStatements.length).to.be(1);
      expect(innerIfStatement.trueStatements[0]).to.be.a(PluginStatement);
      expect(innerIfStatement.trueStatements[0].id).to.be('micdrop');
    });
  });
});
