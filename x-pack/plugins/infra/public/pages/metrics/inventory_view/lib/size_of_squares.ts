/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const SCALE_FACTOR = 0.55;
export const MAX_SIZE = Infinity;
export const MIN_SIZE = 24;

export function sizeOfSquares(
  width: number,
  height: number,
  totalItems: number,
  levels = 1
): number {
  const levelFactor = levels > 1 ? levels * 0.7 : 1;
  const scale = SCALE_FACTOR / levelFactor;
  const x = width * scale;
  const y = height * scale;
  const possibleX = Math.ceil(Math.sqrt((totalItems * x) / y));
  let newX;
  let newY;
  if (Math.floor((possibleX * y) / x) * possibleX < totalItems) {
    newX = y / Math.ceil((possibleX * y) / x);
  } else {
    newX = x / possibleX;
  }
  const possibleY = Math.ceil(Math.sqrt((totalItems * y) / x));
  if (Math.floor((possibleY * x) / y) * possibleY < totalItems) {
    // does not fit
    newY = x / Math.ceil((x * possibleY) / y);
  } else {
    newY = y / possibleY;
  }
  const size = Math.max(newX, newY);
  return Math.min(Math.max(size, MIN_SIZE), MAX_SIZE);
}
