/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Pipeline } from '.';
import { Graph } from '../graph';
import { IfStatement } from './if_statement';
import { PluginStatement } from './plugin_statement';
import { Queue } from './queue';

describe('Pipeline class', () => {
  let graph;

  describe('Pipeline with no statements', () => {
    beforeEach(() => {
      graph = new Graph();
      graph.update({
        vertices: [],
        edges: [],
      });
    });

    it('fromPipelineGraph parses the pipelineGraph correctly', () => {
      const pipeline = Pipeline.fromPipelineGraph(graph);
      expect(pipeline.inputStatements.length).toBe(0);
      expect(pipeline.filterStatements.length).toBe(0);
      expect(pipeline.outputStatements.length).toBe(0);
      expect(pipeline.queue).toBe(null);
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
      });
    });

    it('fromPipelineGraph parses the pipelineGraph correctly', () => {
      const pipeline = Pipeline.fromPipelineGraph(graph);
      expect(pipeline.inputStatements.length).toBe(1);
      expect(pipeline.filterStatements.length).toBe(0);
      expect(pipeline.outputStatements.length).toBe(0);
      expect(pipeline.queue).not.toBe(null);

      expect(pipeline.inputStatements[0]).toBeInstanceOf(PluginStatement);
    });

    it('fromPipelineGraph parses Queue and adds it to Pipeline', () => {
      const pipeline = Pipeline.fromPipelineGraph(graph);

      const { queue } = pipeline;

      expect(queue).toBeInstanceOf(Queue);
      expect(queue.id).toEqual('__QUEUE__');
      expect(queue.hasExplicitId).toEqual(false);
      expect(queue.stats).toBeInstanceOf(Object);
      expect(Object.keys(queue.stats).length).toBe(0);
      expect(queue.meta).toBe(undefined);
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
            stats: {},
          },
        ],
        edges: [],
      });
    });

    it('fromPipelineGraph parses the pipelineGraph correctly', () => {
      const pipeline = Pipeline.fromPipelineGraph(graph);
      expect(pipeline.inputStatements.length).toBe(0);
      expect(pipeline.filterStatements.length).toBe(1);
      expect(pipeline.outputStatements.length).toBe(0);
      expect(pipeline.queue).toBe(null);

      expect(pipeline.filterStatements[0]).toBeInstanceOf(PluginStatement);
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
            stats: {},
          },
        ],
        edges: [],
      });
    });

    it('fromPipelineGraph parses the pipelineGraph correctly', () => {
      const pipeline = Pipeline.fromPipelineGraph(graph);
      expect(pipeline.inputStatements.length).toBe(0);
      expect(pipeline.filterStatements.length).toBe(0);
      expect(pipeline.outputStatements.length).toBe(1);
      expect(pipeline.queue).toBe(null);

      expect(pipeline.outputStatements[0]).toBeInstanceOf(PluginStatement);
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
            id: '296ae28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f0',
            from: '__QUEUE__',
            to: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
            type: 'plain',
          },
        ],
      });
    });

    it('fromPipelineGraph parses the pipelineGraph correctly', () => {
      const pipeline = Pipeline.fromPipelineGraph(graph);
      expect(pipeline.inputStatements.length).toBe(1);
      expect(pipeline.filterStatements.length).toBe(1);
      expect(pipeline.outputStatements.length).toBe(0);
      expect(pipeline.queue).not.toBe(null);

      expect(pipeline.inputStatements[0]).toBeInstanceOf(PluginStatement);
      expect(pipeline.filterStatements[0]).toBeInstanceOf(PluginStatement);
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
            id: '296ae28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f0',
            from: '__QUEUE__',
            to: 'es',
            type: 'plain',
          },
        ],
      });
    });

    it('fromPipelineGraph parses the pipelineGraph correctly', () => {
      const pipeline = Pipeline.fromPipelineGraph(graph);
      expect(pipeline.inputStatements.length).toBe(1);
      expect(pipeline.filterStatements.length).toBe(0);
      expect(pipeline.outputStatements.length).toBe(1);
      expect(pipeline.queue).not.toBe(null);

      expect(pipeline.inputStatements[0]).toBeInstanceOf(PluginStatement);
      expect(pipeline.outputStatements[0]).toBeInstanceOf(PluginStatement);
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
      });
    });

    it('fromPipelineGraph parses the pipelineGraph correctly', () => {
      const pipeline = Pipeline.fromPipelineGraph(graph);
      expect(pipeline.inputStatements.length).toBe(0);
      expect(pipeline.filterStatements.length).toBe(1);
      expect(pipeline.outputStatements.length).toBe(1);
      expect(pipeline.queue).toBe(null);

      expect(pipeline.filterStatements[0]).toBeInstanceOf(PluginStatement);
      expect(pipeline.outputStatements[0]).toBeInstanceOf(PluginStatement);
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
            id: '296ae28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f0',
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
      });
    });

    it('fromPipelineGraph parses the pipelineGraph correctly', () => {
      const pipeline = Pipeline.fromPipelineGraph(graph);
      expect(pipeline.inputStatements.length).toBe(1);
      expect(pipeline.filterStatements.length).toBe(1);
      expect(pipeline.outputStatements.length).toBe(1);
      expect(pipeline.queue).not.toBe(null);

      expect(pipeline.inputStatements[0]).toBeInstanceOf(PluginStatement);
      expect(pipeline.filterStatements[0]).toBeInstanceOf(PluginStatement);
      expect(pipeline.outputStatements[0]).toBeInstanceOf(PluginStatement);
      expect(pipeline.queue).toBeInstanceOf(Queue);
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
      });
    });

    it('fromPipelineGraph parses the pipelineGraph correctly', () => {
      const pipeline = Pipeline.fromPipelineGraph(graph);
      expect(pipeline.inputStatements.length).toBe(0);
      expect(pipeline.filterStatements.length).toBe(1);
      expect(pipeline.outputStatements.length).toBe(0);
      expect(pipeline.queue).toBe(null);

      const ifStatement = pipeline.filterStatements[0];
      expect(ifStatement).toBeInstanceOf(IfStatement);
      expect(ifStatement.trueStatements.length).toBe(1);
      expect(ifStatement.trueStatements[0]).toBeInstanceOf(PluginStatement);
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
      });
    });

    it('fromPipelineGraph parses the pipelineGraph correctly', () => {
      const pipeline = Pipeline.fromPipelineGraph(graph);
      expect(pipeline.inputStatements.length).toBe(0);
      expect(pipeline.filterStatements.length).toBe(0);
      expect(pipeline.outputStatements.length).toBe(1);
      expect(pipeline.queue).toBe(null);

      const ifStatement = pipeline.outputStatements[0];
      expect(ifStatement).toBeInstanceOf(IfStatement);
      expect(ifStatement.trueStatements.length).toBe(1);
      expect(ifStatement.trueStatements[0]).toBeInstanceOf(PluginStatement);
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
            id: '296ae28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f0',
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
      });
    });

    it('fromPipelineGraph parses the pipelineGraph correctly', () => {
      const pipeline = Pipeline.fromPipelineGraph(graph);
      expect(pipeline.inputStatements.length).toBe(1);
      expect(pipeline.filterStatements.length).toBe(1);
      expect(pipeline.outputStatements.length).toBe(0);
      expect(pipeline.queue).not.toBe(null);

      expect(pipeline.inputStatements[0]).toBeInstanceOf(PluginStatement);
      const ifStatement = pipeline.filterStatements[0];
      expect(ifStatement).toBeInstanceOf(IfStatement);
      expect(ifStatement.trueStatements.length).toBe(1);
      expect(ifStatement.trueStatements[0]).toBeInstanceOf(PluginStatement);
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
            id: '296ae28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f0',
            from: '__QUEUE__',
            to: 'a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84',
            type: 'plain',
          },
          {
            id: '96ae28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f02',
            from: 'a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84',
            to: 'log_line_parser',
            type: 'boolean',
            when: true,
          },
          {
            id: '6ae28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f029',
            from: 'a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84',
            to: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
            type: 'boolean',
            when: false,
          },
          {
            id: 'ae28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f0296',
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
      });
    });

    it('fromPipelineGraph parses the pipelineGraph correctly', () => {
      const pipeline = Pipeline.fromPipelineGraph(graph);
      expect(pipeline.inputStatements.length).toBe(1);
      expect(pipeline.filterStatements.length).toBe(1);
      expect(pipeline.outputStatements.length).toBe(1);
      expect(pipeline.queue).not.toBe(null);

      expect(pipeline.inputStatements[0]).toBeInstanceOf(PluginStatement);

      const filterIfStatement = pipeline.filterStatements[0];
      expect(filterIfStatement).toBeInstanceOf(IfStatement);
      expect(filterIfStatement.trueStatements.length).toBe(1);
      expect(filterIfStatement.trueStatements[0]).toBeInstanceOf(PluginStatement);

      const outputIfStatement = pipeline.filterStatements[0];
      expect(outputIfStatement).toBeInstanceOf(IfStatement);
      expect(outputIfStatement.trueStatements.length).toBe(1);
      expect(outputIfStatement.trueStatements[0]).toBeInstanceOf(PluginStatement);
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
      });
    });

    it('fromPipelineGraph parses the pipelineGraph correctly', () => {
      const pipeline = Pipeline.fromPipelineGraph(graph);
      expect(pipeline.inputStatements.length).toBe(2);
      expect(pipeline.filterStatements.length).toBe(0);
      expect(pipeline.outputStatements.length).toBe(0);
      expect(pipeline.queue).not.toBe(null);

      expect(pipeline.inputStatements[0]).toBeInstanceOf(PluginStatement);
      expect(pipeline.inputStatements[0].id).toBe('tweet_harvester');
      expect(pipeline.inputStatements[0].hasExplicitId).toBe(true);
      expect(pipeline.inputStatements[0].pluginType).toBe('input');
      expect(pipeline.inputStatements[0].name).toBe('twitter');

      expect(pipeline.inputStatements[1]).toBeInstanceOf(PluginStatement);
      expect(pipeline.inputStatements[1].id).toBe(
        '296ae28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f0'
      );
      expect(pipeline.inputStatements[1].hasExplicitId).toBe(false);
      expect(pipeline.inputStatements[1].pluginType).toBe('input');
      expect(pipeline.inputStatements[1].name).toBe('stdin');
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
      });
    });

    it('fromPipelineGraph parses the pipelineGraph correctly', () => {
      const pipeline = Pipeline.fromPipelineGraph(graph);
      expect(pipeline.inputStatements.length).toBe(0);
      expect(pipeline.filterStatements.length).toBe(2);
      expect(pipeline.outputStatements.length).toBe(0);
      expect(pipeline.queue).toBe(null);

      expect(pipeline.filterStatements[0]).toBeInstanceOf(PluginStatement);
      expect(pipeline.filterStatements[0].id).toBe('log_line_parser');
      expect(pipeline.filterStatements[0].hasExplicitId).toBe(true);
      expect(pipeline.filterStatements[0].pluginType).toBe('filter');
      expect(pipeline.filterStatements[0].name).toBe('grok');

      expect(pipeline.filterStatements[1]).toBeInstanceOf(PluginStatement);
      expect(pipeline.filterStatements[1].id).toBe(
        '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8'
      );
      expect(pipeline.filterStatements[1].hasExplicitId).toBe(false);
      expect(pipeline.filterStatements[1].pluginType).toBe('filter');
      expect(pipeline.filterStatements[1].name).toBe('mutate');
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
      });
    });

    it('fromPipelineGraph parses the pipelineGraph correctly', () => {
      const pipeline = Pipeline.fromPipelineGraph(graph);
      expect(pipeline.inputStatements.length).toBe(0);
      expect(pipeline.filterStatements.length).toBe(0);
      expect(pipeline.outputStatements.length).toBe(2);
      expect(pipeline.queue).toBe(null);

      expect(pipeline.outputStatements[0]).toBeInstanceOf(PluginStatement);
      expect(pipeline.outputStatements[0].id).toBe('es');
      expect(pipeline.outputStatements[0].hasExplicitId).toBe(true);
      expect(pipeline.outputStatements[0].pluginType).toBe('output');
      expect(pipeline.outputStatements[0].name).toBe('elasticsearch');

      expect(pipeline.outputStatements[1]).toBeInstanceOf(PluginStatement);
      expect(pipeline.outputStatements[1].id).toBe(
        '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8'
      );
      expect(pipeline.outputStatements[1].hasExplicitId).toBe(false);
      expect(pipeline.outputStatements[1].pluginType).toBe('output');
      expect(pipeline.outputStatements[1].name).toBe('stdout');
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
      });
    });

    it('fromPipelineGraph parses the pipelineGraph correctly', () => {
      const pipeline = Pipeline.fromPipelineGraph(graph);
      expect(pipeline.inputStatements.length).toBe(0);
      expect(pipeline.filterStatements.length).toBe(2);
      expect(pipeline.outputStatements.length).toBe(0);
      expect(pipeline.queue).toBe(null);

      expect(pipeline.filterStatements[0]).toBeInstanceOf(PluginStatement);
      expect(pipeline.filterStatements[0].id).toBe('log_line_parser');
      expect(pipeline.filterStatements[0].hasExplicitId).toBe(true);
      expect(pipeline.filterStatements[0].pluginType).toBe('filter');
      expect(pipeline.filterStatements[0].name).toBe('grok');

      const ifStatement = pipeline.filterStatements[1];
      expect(ifStatement).toBeInstanceOf(IfStatement);
      expect(ifStatement.id).toBe(
        '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8'
      );
      expect(ifStatement.hasExplicitId).toBe(false);
      expect(ifStatement.condition).toBe('[is_rt] == "RT"');

      expect(ifStatement.trueStatements[0]).toBeInstanceOf(PluginStatement);
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
      });
    });

    it('fromPipelineGraph parses the pipelineGraph correctly', () => {
      const pipeline = Pipeline.fromPipelineGraph(graph);
      expect(pipeline.inputStatements.length).toBe(0);
      expect(pipeline.filterStatements.length).toBe(3);
      expect(pipeline.outputStatements.length).toBe(0);
      expect(pipeline.queue).toBe(null);

      expect(pipeline.filterStatements[0]).toBeInstanceOf(PluginStatement);
      expect(pipeline.filterStatements[0].id).toBe('log_line_parser');
      expect(pipeline.filterStatements[0].hasExplicitId).toBe(true);
      expect(pipeline.filterStatements[0].pluginType).toBe('filter');
      expect(pipeline.filterStatements[0].name).toBe('grok');

      const ifStatement = pipeline.filterStatements[1];
      expect(ifStatement).toBeInstanceOf(IfStatement);
      expect(ifStatement.id).toBe(
        '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8'
      );
      expect(ifStatement.hasExplicitId).toBe(false);
      expect(ifStatement.condition).toBe('[is_rt] == "RT"');
      expect(ifStatement.trueStatements[0]).toBeInstanceOf(PluginStatement);

      expect(pipeline.filterStatements[2]).toBeInstanceOf(PluginStatement);
      expect(pipeline.filterStatements[2].id).toBe('micdrop');
      expect(pipeline.filterStatements[2].hasExplicitId).toBe(true);
      expect(pipeline.filterStatements[2].pluginType).toBe('filter');
      expect(pipeline.filterStatements[2].name).toBe('drop');
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
      });
    });

    it('fromPipelineGraph parses the pipelineGraph correctly', () => {
      const pipeline = Pipeline.fromPipelineGraph(graph);
      expect(pipeline.inputStatements.length).toBe(0);
      expect(pipeline.filterStatements.length).toBe(0);
      expect(pipeline.outputStatements.length).toBe(2);
      expect(pipeline.queue).toBe(null);

      expect(pipeline.outputStatements[0]).toBeInstanceOf(PluginStatement);
      expect(pipeline.outputStatements[0].id).toBe('es');
      expect(pipeline.outputStatements[0].hasExplicitId).toBe(true);
      expect(pipeline.outputStatements[0].pluginType).toBe('output');
      expect(pipeline.outputStatements[0].name).toBe('elasticsearch');

      const ifStatement = pipeline.outputStatements[1];
      expect(ifStatement).toBeInstanceOf(IfStatement);
      expect(ifStatement.id).toBe(
        '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8'
      );
      expect(ifStatement.hasExplicitId).toBe(false);
      expect(ifStatement.condition).toBe('[is_rt] == "RT"');
      expect(ifStatement.trueStatements[0]).toBeInstanceOf(PluginStatement);
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
      });
    });

    it('fromPipelineGraph parses the pipelineGraph correctly', () => {
      const pipeline = Pipeline.fromPipelineGraph(graph);
      expect(pipeline.inputStatements.length).toBe(0);
      expect(pipeline.filterStatements.length).toBe(0);
      expect(pipeline.outputStatements.length).toBe(3);
      expect(pipeline.queue).toBe(null);

      expect(pipeline.outputStatements[0]).toBeInstanceOf(PluginStatement);
      expect(pipeline.outputStatements[0].id).toBe('es');
      expect(pipeline.outputStatements[0].hasExplicitId).toBe(true);
      expect(pipeline.outputStatements[0].pluginType).toBe('output');
      expect(pipeline.outputStatements[0].name).toBe('elasticsearch');

      const ifStatement = pipeline.outputStatements[1];
      expect(ifStatement).toBeInstanceOf(IfStatement);
      expect(ifStatement.id).toBe(
        '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8'
      );
      expect(ifStatement.hasExplicitId).toBe(false);
      expect(ifStatement.condition).toBe('[is_rt] == "RT"');
      expect(ifStatement.trueStatements[0]).toBeInstanceOf(PluginStatement);

      expect(pipeline.outputStatements[2]).toBeInstanceOf(PluginStatement);
      expect(pipeline.outputStatements[2].id).toBe('local_persistent_out');
      expect(pipeline.outputStatements[2].hasExplicitId).toBe(true);
      expect(pipeline.outputStatements[2].pluginType).toBe('output');
      expect(pipeline.outputStatements[2].name).toBe('file');
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
            id: 'c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f0296ae28a11',
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
      });
    });

    it('fromPipelineGraph parses the pipelineGraph correctly', () => {
      const pipeline = Pipeline.fromPipelineGraph(graph);
      expect(pipeline.inputStatements.length).toBe(2);
      expect(pipeline.filterStatements.length).toBe(2);
      expect(pipeline.outputStatements.length).toBe(3);
      expect(pipeline.queue).not.toBe(null);

      expect(pipeline.inputStatements[0]).toBeInstanceOf(PluginStatement);
      expect(pipeline.inputStatements[0].id).toBe('tweet_harvester');
      expect(pipeline.inputStatements[0].hasExplicitId).toBe(true);
      expect(pipeline.inputStatements[0].pluginType).toBe('input');
      expect(pipeline.inputStatements[0].name).toBe('twitter');

      expect(pipeline.inputStatements[1]).toBeInstanceOf(PluginStatement);
      expect(pipeline.inputStatements[1].id).toBe(
        '296ae28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f0'
      );
      expect(pipeline.inputStatements[1].hasExplicitId).toBe(false);
      expect(pipeline.inputStatements[1].pluginType).toBe('input');
      expect(pipeline.inputStatements[1].name).toBe('stdin');

      expect(pipeline.filterStatements[0]).toBeInstanceOf(PluginStatement);
      expect(pipeline.filterStatements[0].id).toBe('log_line_parser');
      expect(pipeline.filterStatements[0].hasExplicitId).toBe(true);
      expect(pipeline.filterStatements[0].pluginType).toBe('filter');
      expect(pipeline.filterStatements[0].name).toBe('grok');

      const filterIfStatement = pipeline.filterStatements[1];
      expect(filterIfStatement).toBeInstanceOf(IfStatement);
      expect(filterIfStatement.id).toBe(
        '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8'
      );
      expect(filterIfStatement.hasExplicitId).toBe(false);
      expect(filterIfStatement.condition).toBe('[is_rt] == "RT"');
      expect(filterIfStatement.trueStatements[0]).toBeInstanceOf(PluginStatement);

      expect(pipeline.outputStatements[0]).toBeInstanceOf(PluginStatement);
      expect(pipeline.outputStatements[0].id).toBe('es');
      expect(pipeline.outputStatements[0].hasExplicitId).toBe(true);
      expect(pipeline.outputStatements[0].pluginType).toBe('output');
      expect(pipeline.outputStatements[0].name).toBe('elasticsearch');

      const outputIfStatement = pipeline.outputStatements[1];
      expect(outputIfStatement).toBeInstanceOf(IfStatement);
      expect(outputIfStatement.id).toBe(
        '90f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84a8'
      );
      expect(outputIfStatement.hasExplicitId).toBe(false);
      expect(outputIfStatement.condition).toBe('[is_rt] == "RT"');
      expect(outputIfStatement.trueStatements[0]).toBeInstanceOf(PluginStatement);

      expect(pipeline.outputStatements[2]).toBeInstanceOf(PluginStatement);
      expect(pipeline.outputStatements[2].id).toBe('local_persistent_out');
      expect(pipeline.outputStatements[2].hasExplicitId).toBe(true);
      expect(pipeline.outputStatements[2].pluginType).toBe('output');
      expect(pipeline.outputStatements[2].name).toBe('file');

      expect(pipeline.queue).toBeInstanceOf(Queue);
      expect(pipeline.queue.id).toBe('__QUEUE__');
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
      });
    });

    it('fromPipelineGraph parses the pipelineGraph correctly', () => {
      const pipeline = Pipeline.fromPipelineGraph(graph);
      expect(pipeline.inputStatements.length).toBe(0);
      expect(pipeline.filterStatements.length).toBe(1);
      expect(pipeline.outputStatements.length).toBe(0);
      expect(pipeline.queue).toBe(null);

      const ifStatement = pipeline.filterStatements[0];
      expect(ifStatement).toBeInstanceOf(IfStatement);
      expect(ifStatement.id).toBe(
        '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8'
      );
      expect(ifStatement.hasExplicitId).toBe(false);
      expect(ifStatement.condition).toBe('[is_rt] == "RT"');

      expect(ifStatement.trueStatements[0]).toBeInstanceOf(PluginStatement);
      expect(ifStatement.trueStatements[0].id).toBe(
        'a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84'
      );

      expect(ifStatement.elseStatements[0]).toBeInstanceOf(PluginStatement);
      expect(ifStatement.elseStatements[0].id).toBe('micdrop');
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
      });
    });

    it('fromPipelineGraph parses the pipelineGraph correctly', () => {
      const pipeline = Pipeline.fromPipelineGraph(graph);
      expect(pipeline.inputStatements.length).toBe(0);
      expect(pipeline.filterStatements.length).toBe(1);
      expect(pipeline.outputStatements.length).toBe(0);
      expect(pipeline.queue).toBe(null);

      const ifStatement = pipeline.filterStatements[0];
      expect(ifStatement).toBeInstanceOf(IfStatement);
      expect(ifStatement.id).toBe(
        '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8'
      );
      expect(ifStatement.hasExplicitId).toBe(false);
      expect(ifStatement.condition).toBe('[is_rt] == "RT"');

      expect(ifStatement.trueStatements.length).toBe(2);
      expect(ifStatement.trueStatements[0]).toBeInstanceOf(PluginStatement);
      expect(ifStatement.trueStatements[0].id).toBe(
        'a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84'
      );
      expect(ifStatement.trueStatements[1]).toBeInstanceOf(PluginStatement);
      expect(ifStatement.trueStatements[1].id).toBe('micdrop');

      expect(ifStatement.elseStatements.length).toBe(0);
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
            stats: {},
          },
          {
            id: '890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84a',
            explicit_id: false,
            type: 'plugin',
            plugin_type: 'filter',
            config_name: 'grok',
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
            to: '890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84a',
            type: 'boolean',
            when: true,
          },
          {
            id: '591f523dee3465d4c38f20232c56db453a9e4258af5885bf8c79f517690bc535',
            from: '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
            to: 'a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84',
            type: 'boolean',
            when: false,
          },
          {
            id: '5591f523dee3465d4c38f20232c56db453a9e4258af5885bf8c79f517690bc53',
            from: 'a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84',
            to: 'micdrop',
            type: 'plain',
          },
        ],
      });
    });

    it('fromPipelineGraph parses the pipelineGraph correctly', () => {
      const pipeline = Pipeline.fromPipelineGraph(graph);
      expect(pipeline.inputStatements.length).toBe(0);
      expect(pipeline.filterStatements.length).toBe(1);
      expect(pipeline.outputStatements.length).toBe(0);
      expect(pipeline.queue).toBe(null);

      const ifStatement = pipeline.filterStatements[0];
      expect(ifStatement).toBeInstanceOf(IfStatement);
      expect(ifStatement.id).toBe(
        '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8'
      );
      expect(ifStatement.hasExplicitId).toBe(false);
      expect(ifStatement.condition).toBe('[is_rt] == "RT"');

      expect(ifStatement.trueStatements.length).toBe(1);
      expect(ifStatement.trueStatements[0]).toBeInstanceOf(PluginStatement);
      expect(ifStatement.trueStatements[0].id).toBe(
        '890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84a'
      );

      expect(ifStatement.elseStatements.length).toBe(2);
      expect(ifStatement.elseStatements[0]).toBeInstanceOf(PluginStatement);
      expect(ifStatement.elseStatements[0].id).toBe(
        'a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84'
      );
      expect(ifStatement.elseStatements[1]).toBeInstanceOf(PluginStatement);
      expect(ifStatement.elseStatements[1].id).toBe('micdrop');
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
            stats: {},
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
                column: 5,
              },
            },
            explicit_id: false,
            stats: null,
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
                column: 5,
              },
            },
            explicit_id: true,
            stats: null,
          },
        ],
        edges: [
          {
            id: '35591f523dee3465d4c38f20232c56db453a9e4258af5885bf8c79f517690bc5',
            from: 'the_if',
            to: 'plugin_1',
            type: 'boolean',
            when: true,
          },
          {
            id: '591f523dee3465d4c38f20232c56db453a9e4258af5885bf8c79f517690bc535',
            from: 'the_if',
            to: 'plugin_2',
            type: 'boolean',
            when: true,
          },
        ],
      });
    });

    it('has two child statements', () => {
      const pipeline = Pipeline.fromPipelineGraph(graph);

      expect(pipeline.outputStatements.length).toBe(1);
      const { trueStatements } = pipeline.outputStatements[0];
      expect(trueStatements.length).toBe(2);
      expect(trueStatements[0].id).toBe('plugin_1');
      expect(trueStatements[1].id).toBe('plugin_2');
      expect(pipeline.outputStatements[0].elseStatements.length).toBe(0);
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
            stats: {},
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
                column: 5,
              },
            },
            explicit_id: false,
            stats: null,
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
                column: 5,
              },
            },
            explicit_id: true,
            stats: null,
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
                column: 5,
              },
            },
            explicit_id: false,
            stats: null,
          },
        ],
        edges: [
          {
            id: '35591f523dee3465d4c38f20232c56db453a9e4258af5885bf8c79f517690bc5',
            from: 'the_if',
            to: 'plugin_1',
            type: 'boolean',
            when: false,
          },
          {
            id: '591f523dee3465d4c38f20232c56db453a9e4258af5885bf8c79f517690bc535',
            from: 'the_if',
            to: 'plugin_2',
            type: 'boolean',
            when: false,
          },
          {
            id: '637281923dee3465d4c38f20232c56db453a9e4258af5885bf8c79f517690bc5',
            from: 'the_if',
            to: 'plugin_3',
            type: 'boolean',
            when: true,
          },
        ],
      });
    });

    it('has two child else statements', () => {
      const pipeline = Pipeline.fromPipelineGraph(graph);

      expect(pipeline.outputStatements.length).toBe(1);
      const { trueStatements, elseStatements } = pipeline.outputStatements[0];
      expect(trueStatements.length).toBe(1);
      expect(trueStatements[0].id).toBe('plugin_3');
      expect(elseStatements.length).toBe(2);
      expect(elseStatements[0].id).toBe('plugin_1');
      expect(elseStatements[1].id).toBe('plugin_2');
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
      });
    });

    it('fromPipelineGraph parses the pipelineGraph correctly', () => {
      const pipeline = Pipeline.fromPipelineGraph(graph);
      expect(pipeline.inputStatements.length).toBe(0);
      expect(pipeline.filterStatements.length).toBe(1);
      expect(pipeline.outputStatements.length).toBe(0);
      expect(pipeline.queue).toBe(null);

      const outerIfStatement = pipeline.filterStatements[0];
      expect(outerIfStatement).toBeInstanceOf(IfStatement);
      expect(outerIfStatement.id).toBe(
        '4a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8'
      );
      expect(outerIfStatement.hasExplicitId).toBe(false);
      expect(outerIfStatement.condition).toBe('[is_rt] == "RT"');

      const innerIfStatement = outerIfStatement.trueStatements[0];
      expect(innerIfStatement).toBeInstanceOf(IfStatement);
      expect(innerIfStatement.id).toBe(
        'a890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e84'
      );
      expect(innerIfStatement.hasExplicitId).toBe(false);
      expect(innerIfStatement.condition).toBe('[has_image] == true');

      expect(innerIfStatement.trueStatements.length).toBe(1);
      expect(innerIfStatement.trueStatements[0]).toBeInstanceOf(PluginStatement);
      expect(innerIfStatement.trueStatements[0].id).toBe('micdrop');
    });
  });
});
