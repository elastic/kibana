/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequiredPaletteParamTypes } from '@kbn/coloring';
import { defaultPaletteParams as sharedDefaultParams } from '../../shared_components';

const DEFAULT_PALETTE_NAME = 'status';
const DEFAULT_COLOR_STEPS = 3;
export const RANGE_MIN = 0;

export const defaultPaletteParams: RequiredPaletteParamTypes = {
  ...sharedDefaultParams,
  name: DEFAULT_PALETTE_NAME,
  steps: DEFAULT_COLOR_STEPS,
  maxSteps: 5,
};
