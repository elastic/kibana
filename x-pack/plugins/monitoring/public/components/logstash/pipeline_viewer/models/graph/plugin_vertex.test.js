/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { Vertex } from './vertex';
import { PluginVertex, TIME_CONSUMING_PROCESSOR_THRESHOLD_COEFFICIENT } from './plugin_vertex';

describe('PluginVertex', () => {
  let graph;
  let vertexJson;

  beforeEach(() => {
    graph = {
      processorVertices: [{ latestMillisPerEvent: 50 }, { latestMillisPerEvent: 10 }],
    };
    vertexJson = {
      config_name: 'some-name',
      stats: {
        millis_per_event: 50,
        percent_of_total_processor_duration: 0.3,
        events_in_per_millisecond: 0.01,
        events_out_per_millisecond: 0.01,
      },
    };
  });

  it('should be an instance of Vertex', () => {
    const pluginVertex = new PluginVertex(graph, vertexJson);
    expect(pluginVertex).to.be.a(Vertex);
  });

  it('should have a type of plugin', () => {
    const pluginVertex = new PluginVertex(graph, vertexJson);
    expect(pluginVertex.typeString).to.be('plugin');
  });

  it('should have the correct name', () => {
    const pluginVertex = new PluginVertex(graph, vertexJson);
    expect(pluginVertex.name).to.be('some-name');
  });

  it('should have the correct milliseconds-per-event stat', () => {
    const pluginVertex = new PluginVertex(graph, vertexJson);
    expect(pluginVertex.latestMillisPerEvent).to.be(50);
  });

  it('should have the correct percent-of-total-processor-time stat', () => {
    const pluginVertex = new PluginVertex(graph, vertexJson);
    expect(pluginVertex.percentOfTotalProcessorTime).to.be(0.3);
  });

  it('should have the correct events-per-second stat', () => {
    const pluginVertex = new PluginVertex(graph, vertexJson);
    expect(pluginVertex.latestEventsPerSecond).to.be(10);
  });

  describe('isTimeConsuming', () => {
    let percentExecution;

    beforeEach(() => {
      percentExecution = 1 / graph.processorVertices.length;
    });

    it('should have a false isTimeConsuming result when the plugin consumes an average amount of execution time', () => {
      vertexJson.stats.percent_of_total_processor_duration = percentExecution;
      const pluginVertex = new PluginVertex(graph, vertexJson);
      expect(pluginVertex.isTimeConsuming()).to.be(false);
    });

    it('should have a true isTimeConsuming result when the plugin consumes a large amount of execution time', () => {
      vertexJson.stats.percent_of_total_processor_duration =
        0.1 + percentExecution * TIME_CONSUMING_PROCESSOR_THRESHOLD_COEFFICIENT;
      const pluginVertex = new PluginVertex(graph, vertexJson);
      expect(pluginVertex.isTimeConsuming()).to.be(true);
    });
  });

  describe('isSlow', () => {
    beforeEach(() => {
      graph.processorVertices[0].millis_per_event = 1;
      graph.processorVertices[1].millis_per_event = 999999999999999999;
    });

    it("should have a true isSlow result when the plugin's seconds per event is 2 standard deviations above the mean", () => {
      vertexJson.stats.millis_per_event = 999999999999999999;
      const pluginVertex = new PluginVertex(graph, vertexJson);
      expect(pluginVertex.isSlow()).to.be(true);
    });

    it("should have a false isSlow result when the plugin's seconds per event is 2 standard deviations above the mean", () => {
      vertexJson.stats.millis_per_event = 1;
      const pluginVertex = new PluginVertex(graph, vertexJson);
      expect(pluginVertex.isSlow()).to.be(false);
    });
  });

  describe('input plugin vertex', () => {
    beforeEach(() => {
      vertexJson.plugin_type = 'input';
    });

    it('should have the correct plugin type', () => {
      const pluginVertex = new PluginVertex(graph, vertexJson);
      expect(pluginVertex.pluginType).to.be('input');
    });

    it('should be an input vertex', () => {
      const pluginVertex = new PluginVertex(graph, vertexJson);
      expect(pluginVertex.isInput).to.be(true);
    });

    it('should not be a processor vertex', () => {
      const pluginVertex = new PluginVertex(graph, vertexJson);
      expect(pluginVertex.isProcessor).to.be(false);
    });

    it('should use the correct icon', () => {
      const pluginVertex = new PluginVertex(graph, vertexJson);
      expect(pluginVertex.iconType).to.be('logstashInput');
    });
  });

  it('icon should throw an error if type of plugin is unknown', () => {
    vertexJson.plugin_type = 'foobar';
    const pluginVertex = new PluginVertex(graph, vertexJson);
    const fn = () => pluginVertex.iconType;
    expect(fn).to.throwError();
  });

  describe('filter plugin vertex', () => {
    beforeEach(() => {
      vertexJson.plugin_type = 'filter';
    });

    it('should have the correct plugin type', () => {
      const pluginVertex = new PluginVertex(graph, vertexJson);
      expect(pluginVertex.pluginType).to.be('filter');
    });

    it('should not be an input vertex', () => {
      const pluginVertex = new PluginVertex(graph, vertexJson);
      expect(pluginVertex.isInput).to.be(false);
    });

    it('should be a processor vertex', () => {
      const pluginVertex = new PluginVertex(graph, vertexJson);
      expect(pluginVertex.isProcessor).to.be(true);
    });

    it('should use the correct icon', () => {
      const pluginVertex = new PluginVertex(graph, vertexJson);
      expect(pluginVertex.iconType).to.be('logstashFilter');
    });
  });

  describe('output plugin vertex', () => {
    beforeEach(() => {
      vertexJson.plugin_type = 'output';
    });

    it('should have the correct plugin type', () => {
      const pluginVertex = new PluginVertex(graph, vertexJson);
      expect(pluginVertex.pluginType).to.be('output');
    });

    it('should not be an input vertex', () => {
      const pluginVertex = new PluginVertex(graph, vertexJson);
      expect(pluginVertex.isInput).to.be(false);
    });

    it('should be a processor vertex', () => {
      const pluginVertex = new PluginVertex(graph, vertexJson);
      expect(pluginVertex.isProcessor).to.be(true);
    });

    it('should use the correct icon', () => {
      const pluginVertex = new PluginVertex(graph, vertexJson);
      expect(pluginVertex.iconType).to.be('logstashOutput');
    });
  });
});
