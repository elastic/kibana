/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FC } from 'react';
import { PalettePicker, PalettePickerProps } from '../../../../public/components/palette_picker';

const DEFAULT_PALETTE = 'default';
const STOPS_PALETTE = 'stops';

const paletteTypes: Record<string, FC<PalettePickerProps>> = {
  [DEFAULT_PALETTE]: PalettePicker,
  [STOPS_PALETTE]: PalettePicker,
};

export const getPaletteType = (type: string = '') =>
  paletteTypes[type] ?? paletteTypes[DEFAULT_PALETTE];
