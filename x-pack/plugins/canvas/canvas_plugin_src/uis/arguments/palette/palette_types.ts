/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PalettePicker, StopsPalettePicker } from '../../../../public/components/palette_picker';

const DEFAULT_PALETTE = 'default';
const STOPS_PALETTE = 'stops';

export type ColorPaletteName = typeof DEFAULT_PALETTE | typeof STOPS_PALETTE;

const paletteTypes = {
  [DEFAULT_PALETTE]: PalettePicker,
  [STOPS_PALETTE]: StopsPalettePicker,
};

export const getPaletteType = (type: ColorPaletteName = DEFAULT_PALETTE) =>
  paletteTypes[type] ?? paletteTypes[DEFAULT_PALETTE];
