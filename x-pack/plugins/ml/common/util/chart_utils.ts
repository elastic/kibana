/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extent, max, min } from 'd3';
import { CHART_TYPE, ChartType } from '../constants/charts';
import type { SeriesConfigWithMetadata } from '../types/results';
import type { ChartPoint } from '../types/results';

/**
 * TODO check if these flags are still needed
 */
const EVENT_DISTRIBUTION_ENABLED = true;
const POPULATION_DISTRIBUTION_ENABLED = true;

/**
 * Get the chart type based on its configuration
 * @param config
 */
export function getChartType(config: SeriesConfigWithMetadata): ChartType {
  let chartType: ChartType = CHART_TYPE.SINGLE_METRIC;

  if (config.functionDescription === 'lat_long' || config.mapData !== undefined) {
    return CHART_TYPE.GEO_MAP;
  }

  if (
    EVENT_DISTRIBUTION_ENABLED &&
    config.functionDescription === 'rare' &&
    config.entityFields.some((f) => f.fieldType === 'over') === false
  ) {
    chartType = CHART_TYPE.EVENT_DISTRIBUTION;
  } else if (
    POPULATION_DISTRIBUTION_ENABLED &&
    config.functionDescription !== 'rare' &&
    config.entityFields.some((f) => f.fieldType === 'over') &&
    config.metricFunction !== null // Event distribution chart relies on the ML function mapping to an ES aggregation
  ) {
    chartType = CHART_TYPE.POPULATION_DISTRIBUTION;
  }

  if (
    chartType === CHART_TYPE.EVENT_DISTRIBUTION ||
    chartType === CHART_TYPE.POPULATION_DISTRIBUTION
  ) {
    // Check that the config does not use script fields defined in the datafeed config.
    if (config.datafeedConfig !== undefined && config.datafeedConfig.script_fields !== undefined) {
      const scriptFields = Object.keys(config.datafeedConfig.script_fields);
      const checkFields = config.entityFields.map((entity) => entity.fieldName);
      if (config.metricFieldName) {
        checkFields.push(config.metricFieldName);
      }
      const usesScriptFields =
        checkFields.find((fieldName) => scriptFields.includes(fieldName)) !== undefined;
      if (usesScriptFields === true) {
        // Only single metric chart type supports query of model plot data.
        chartType = CHART_TYPE.SINGLE_METRIC;
      }
    }
  }

  return chartType;
}

export function chartLimits(data: ChartPoint[] = []) {
  const domain = extent(data, (d) => {
    let metricValue = d.value as number;
    if (metricValue === null && d.anomalyScore !== undefined && d.actual !== undefined) {
      // If an anomaly coincides with a gap in the data, use the anomaly actual value.
      metricValue = Array.isArray(d.actual) ? d.actual[0] : d.actual;
    }
    return metricValue;
  });
  const limits = { max: domain[1], min: domain[0] };

  if (limits.max === limits.min) {
    // @ts-ignore
    limits.max = max(data, (d) => {
      if (d.typical) {
        return Math.max(d.value as number, ...d.typical);
      } else {
        // If analysis with by and over field, and more than one cause,
        // there will be no actual and typical value.
        // TODO - produce a better visual for population analyses.
        return d.value;
      }
    });
    // @ts-ignore
    limits.min = min(data, (d) => {
      if (d.typical) {
        return Math.min(d.value as number, ...d.typical);
      } else {
        // If analysis with by and over field, and more than one cause,
        // there will be no actual and typical value.
        // TODO - produce a better visual for population analyses.
        return d.value;
      }
    });
  }

  // add padding of 5% of the difference between max and min
  // if we ended up with the same value for both of them
  if (limits.max === limits.min) {
    const padding = limits.max * 0.05;
    limits.max += padding;
    limits.min -= padding;
  }

  return limits;
}
