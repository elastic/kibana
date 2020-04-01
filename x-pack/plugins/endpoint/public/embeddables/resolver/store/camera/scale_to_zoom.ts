/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { maximum, minimum, zoomCurveRate } from './scaling_constants';

/**
 * Calculates the zoom factor (between 0 and 1) for a given scale value.
 */
export const scaleToZoom = (scale: number): number => {
  const delta = maximum - minimum;
  return Math.pow((scale - minimum) / delta, 1 / zoomCurveRate);
};
