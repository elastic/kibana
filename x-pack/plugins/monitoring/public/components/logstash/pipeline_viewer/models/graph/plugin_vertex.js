/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { last, get, omit } from 'lodash';
import { Vertex } from './vertex';
import inputIcon from '@elastic/eui/src/components/icon/assets/logstash_input.svg';
import filterIcon from '@elastic/eui/src/components/icon/assets/logstash_filter.svg';
import outputIcon from '@elastic/eui/src/components/icon/assets/logstash_output.svg';

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
    const latestMillisPerEventBucket = last(get(this.stats, 'millis_per_event.data', [])) || [];
    return latestMillisPerEventBucket[1];
  }

  get percentOfTotalProcessorTime() {
    const latestPercentOfTotalProcessorDurationBucket = last(get(this.stats, 'percent_of_total_processor_duration.data', [])) || [];
    return latestPercentOfTotalProcessorDurationBucket[1];
  }

  get eventsPerSecond() {
    const eventsPerMillisecond = this.stats.events_per_millisecond;
    return {
      ...omit(eventsPerMillisecond, 'data'),
      data: get(eventsPerMillisecond, 'data', []).map(([x, y]) => [x, y * 1000])
    };
  }

  get latestEventsPerSecond() {
    const latestBucket = last(get(this.eventsPerSecond, 'data', [])) || [];
    return latestBucket[1];
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

  get icon() {
    switch(this.pluginType) {
      case 'input':
        return inputIcon;
      case 'filter':
        return filterIcon;
      case 'output':
        return outputIcon;
      default:
        throw new Error(`Unknown plugin type ${this.pluginType}! This shouldn't happen!`);
    }
  }

  get next() {
    const firstOutgoingEdge = this.outgoingEdges[0] || {};
    return firstOutgoingEdge.to;
  }
}
