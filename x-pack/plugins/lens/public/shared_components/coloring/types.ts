/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PaletteOutput, PaletteRegistry } from 'src/plugins/charts/public';
import type { CustomPaletteParams } from '../../../common';
import type { ColorRange, ColorRangesActions } from './color_ranges';

export interface PaletteConfigurationState {
  activePalette: PaletteOutput<CustomPaletteParams>;
  colorRanges: ColorRange[];
}

/** @internal **/
export interface DataBounds {
  min: number;
  max: number;
  fallback?: boolean;
}

/** @internal **/
export interface UpdateRangeTypePayload {
  rangeType: CustomPaletteParams['rangeType'];
  palettes: PaletteRegistry;
  dataBounds: DataBounds;
}

/** @internal **/
export interface ChangeColorPalettePayload {
  palette: PaletteOutput<CustomPaletteParams>;
  palettes: PaletteRegistry;
  dataBounds: DataBounds;
  disableSwitchingContinuity: boolean;
}

export type PaletteConfigurationActions =
  | ColorRangesActions
  | { type: 'updateRangeType'; payload: UpdateRangeTypePayload }
  | { type: 'changeColorPalette'; payload: ChangeColorPalettePayload };
