/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeScaleExpressionFunction } from './types';
import type { timeScaleFn } from './time_scale_fn';

export const getTimeScale = (
  ...timeScaleFnParameters: Parameters<typeof timeScaleFn>
): TimeScaleExpressionFunction => ({
  name: 'lens_time_scale',
  type: 'datatable',
  args: {
    dateColumnId: {
      types: ['string'],
    },
    inputColumnId: {
      types: ['string'],
      required: true,
    },
    outputColumnId: {
      types: ['string'],
      required: true,
    },
    outputColumnName: {
      types: ['string'],
    },
    targetUnit: {
      types: ['string'],
      options: ['s', 'm', 'h', 'd'],
      required: true,
    },
    reducedTimeRange: {
      types: ['string'],
    },
  },
  inputTypes: ['datatable'],
  async fn(...args) {
    /** Build optimization: prevent adding extra code into initial bundle **/
    const { timeScaleFn } = await import('./time_scale_fn');
    return timeScaleFn(...timeScaleFnParameters)(...args);
  },
});
