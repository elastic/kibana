/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const TYPING_DEBOUNCE_TIME = 256;
// Taken from the Visualize editor
export const FROM_PLACEHOLDER = '\u2212\u221E';
export const TO_PLACEHOLDER = '+\u221E';

export const DEFAULT_INTERVAL = 1000;
export const AUTO_BARS = 'auto';
export const MIN_HISTOGRAM_BARS = 1;
export const SLICES = 6;

export const MODES = {
  Range: 'range',
  Histogram: 'histogram',
} as const;
