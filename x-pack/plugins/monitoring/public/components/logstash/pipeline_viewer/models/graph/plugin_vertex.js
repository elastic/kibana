/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { Vertex } from './vertex';

export const TIME_CONSUMING_PROCESSOR_THRESHOLD_COEFFICIENT = 2;
export const SLOWNESS_STANDARD_DEVIATIONS_ABOVE_THE_MEAN = 2;

export class PluginVertex extends Vertex {
  get typeString() {
    return 'plugin';
  }

  get name() {
    return this.json.config_name;
  }

  get title() {
    return this.name;
  }

  get pluginType() {
    return this.json.plugin_type;
  }

  get isInput() {
    return this.pluginType === 'input';
  }

  get isFilter() {
    return this.pluginType === 'filter';
  }

  get isOutput() {
    return this.pluginType === 'output';
  }

  get isProcessor() {
    return this.isFilter || this.isOutput;
  }

  get latestMillisPerEvent() {
    return get(this.stats, 'millis_per_event');
  }

  get percentOfTotalProcessorTime() {
    return get(this.stats, 'percent_of_total_processor_duration');
  }

  get eventsPerMillisecond() {
    return this.isInput
      ? this.stats.events_out_per_millisecond
      : this.stats.events_in_per_millisecond;
  }

  get eventsPerSecond() {
    if (!this.eventsPerMillisecond.hasOwnProperty('data')) {
      return this.eventsPerMillisecond * 1000;
    }

    const eps = { ...this.eventsPerMillisecond }; // Clone the object so we don't modify the original one
    eps.data = this.eventsPerMillisecond.data.map(([timestamp, value]) => [ timestamp, value * 1000]);
    return eps;
  }

  get latestEventsPerSecond() {
    if (!this.eventsPerSecond.hasOwnProperty('data')) {
      return this.eventsPerSecond;
    }

    const numTimeseriesBuckets = this.eventsPerSecond.data.length;
    return this.eventsPerSecond.data[numTimeseriesBuckets - 1][1];
  }

  isTimeConsuming() {
    // We assume that a 'normal' processor takes an equal share of execution time
    const expectedPercentOfTotalProcessorTime = 1 / this.graph.processorVertices.length;

    // If a processor takes more than some threshold beyond that it may be slow
    const threshold = TIME_CONSUMING_PROCESSOR_THRESHOLD_COEFFICIENT * expectedPercentOfTotalProcessorTime;

    return this.percentOfTotalProcessorTime > threshold;
  }

  isSlow() {
    const totalProcessorVertices = this.graph.processorVertices.length;

    if (totalProcessorVertices === 0) {
      return 0;
    }

    const meanmillisPerEvent = this.graph.processorVertices.reduce((acc, v) => {
      return acc + v.latestMillisPerEvent || 0;
    }, 0) / totalProcessorVertices;

    const variance = this.graph.processorVertices.reduce((acc, v) => {
      const difference = (v.latestMillisPerEvent || 0) - meanmillisPerEvent;
      const square = difference * difference;
      return acc + square;
    }, 0) / totalProcessorVertices;

    const stdDeviation = Math.sqrt(variance);

    // Std deviations above the mean
    const slowness = (this.latestMillisPerEvent - meanmillisPerEvent) / stdDeviation;

    return slowness > SLOWNESS_STANDARD_DEVIATIONS_ABOVE_THE_MEAN;
  }

  get iconType() {
    switch(this.pluginType) {
      case 'input':
        return 'logstashInput';
      case 'filter':
        return 'logstashFilter';
      case 'output':
        return 'logstashOutput';
      default:
        throw new Error(`Unknown plugin type ${this.pluginType}! This shouldn't happen!`);
    }
  }

  get next() {
    const firstOutgoingEdge = this.outgoingEdges[0] || {};
    return firstOutgoingEdge.to;
  }
}
