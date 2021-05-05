/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CustomPaletteParams } from '../../expression';
export type RequiredPaletteParamTypes = Required<CustomPaletteParams>;
export interface ColorStop {
  color: string;
  stop: number;
}

export const DEFAULT_PALETTE_NAME = 'positive';
export const FIXED_PROGRESSION = 'fixed';
export const STEPPED_PROGRESSION = 'stepped';
export const CUSTOM_PALETTE = 'custom';
export const DEFAULT_CONTINUITY = 'above';
export const DEFAULT_MIN_STOP = 0;
export const DEFAULT_MAX_STOP = 100;
export const MAX_COLOR_STEPS = 12;
export const MIN_COLOR_STEPS = 1;
export const DEFAULT_COLOR_STEPS = 10;
export const DEFAULT_CUSTOM_STEPS = 4;
export const DEFAULT_COLOR = '#6092C0'; // Same as EUI ColorStops default for new stops
export const defaultParams: RequiredPaletteParamTypes = {
  name: DEFAULT_PALETTE_NAME,
  reverse: false,
  rangeType: 'percent',
  progression: STEPPED_PROGRESSION,
  stops: [],
  steps: DEFAULT_COLOR_STEPS,
  controlStops: [],
  continuity: DEFAULT_CONTINUITY,
};
