/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const X_MIN = -50 as const;
export const Y_MIN = -50 as const;
export const X_MAX = 50 as const;
export const Y_MAX = 50 as const;
export const MAX_BOUNDS: [number, number, number, number] = [
  X_MIN,
  Y_MIN,
  X_MAX,
  Y_MAX,
];
export const MAX_BOUNDS_EXTENDED: [number, number, number, number] = [
  -90, -90, 90, 90,
];

export const BACKGROUND_SOURCE_ID = 'background-source';
export const BACKGROUND_LAYER_ID = 'background-layer';

export const SYNTHETICS_SOURCE_ID = 'synthetics-source';
export const SYNTHETICS_LAYER_ID = 'synthetics-layer';

export const CLICKS_SOURCE_ID = 'clicks-source';
export const CLICKS_LAYER_ID = 'clicks-layer';
