/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { scaleLinear } from 'd3-scale';

export const DEFAULT_ARROW_HEIGHT = 1;
export const MAX_ARROW_HEIGHT = 4;

/** Returns the height of an arrow in pixels based on the specified percent (0-100) */
export const getArrowHeightFromPercent = scaleLinear()
  .domain([0, 100])
  .range([DEFAULT_ARROW_HEIGHT, MAX_ARROW_HEIGHT])
  .clamp(true);

/** Returns a percent, or undefined if the percent cannot be calculated */
export const getPercent = ({
  numerator,
  denominator,
}: {
  numerator: number;
  denominator: number;
}): number | undefined => {
  if (
    Math.abs(denominator) < Number.EPSILON ||
    !Number.isFinite(numerator) ||
    !Number.isFinite(denominator)
  ) {
    return undefined;
  }

  return (numerator / denominator) * 100;
};

/** Returns true if the input is an array that holds one value */
export const hasOneValue = <T>(array: T[] | null | undefined): boolean =>
  Array.isArray(array) && array.length === 1;
