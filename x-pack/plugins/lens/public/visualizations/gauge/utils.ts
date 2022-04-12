/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Accessors } from '../../../../../../src/plugins/chart_expressions/expression_gauge/common';
import { GaugeVisualizationState } from './constants';

export const getAccessorsFromState = (state?: GaugeVisualizationState): Accessors | undefined => {
  const { minAccessor, maxAccessor, goalAccessor, metricAccessor } = state ?? {};
  if (!metricAccessor && !maxAccessor && !goalAccessor && !metricAccessor) {
    return;
  }
  return { min: minAccessor, max: maxAccessor, goal: goalAccessor, metric: metricAccessor };
};
