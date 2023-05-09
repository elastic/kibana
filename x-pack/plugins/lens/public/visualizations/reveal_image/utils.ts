/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Accessors } from '@kbn/expression-gauge-plugin/common';
import type { RevealImageVisualizationState } from './constants';

export const getAccessorsFromState = (
  state?: RevealImageVisualizationState
): Accessors | undefined => {
  const { metricAccessor } = state ?? {};
  if (!metricAccessor) {
    return;
  }
  return { metric: metricAccessor };
};
