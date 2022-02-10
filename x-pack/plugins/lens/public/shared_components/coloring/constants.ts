/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequiredPaletteParamTypes } from '../../../common';

export const DEFAULT_PALETTE_NAME = 'positive';
export const FIXED_PROGRESSION = 'fixed' as const;
export const CUSTOM_PALETTE = 'custom';
export const DEFAULT_CONTINUITY = 'above';
export const DEFAULT_RANGE_TYPE = 'percent';
export const DEFAULT_MIN_STOP = 0;
export const DEFAULT_MAX_STOP = 100;
export const DEFAULT_COLOR_STEPS = 5;
export const DEFAULT_COLOR = '#6092C0'; // Same as EUI ColorStops default for new stops

export const defaultPaletteParams: RequiredPaletteParamTypes = {
  maxSteps: undefined,
  name: DEFAULT_PALETTE_NAME,
  reverse: false,
  rangeType: DEFAULT_RANGE_TYPE,
  rangeMin: DEFAULT_MIN_STOP,
  rangeMax: DEFAULT_MAX_STOP,
  progression: FIXED_PROGRESSION,
  stops: [],
  steps: DEFAULT_COLOR_STEPS,
  colorStops: [],
  continuity: DEFAULT_CONTINUITY,
};
