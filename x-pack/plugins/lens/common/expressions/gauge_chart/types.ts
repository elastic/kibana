/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PaletteOutput,
  CustomPaletteState,
} from '../../../../../../src/plugins/charts/common';
import type { CustomPaletteParams, LayerType } from '../../types';

export const GAUGE_FUNCTION = 'lens_gauge';
export const GAUGE_FUNCTION_RENDERER = 'lens_gauge_renderer';

export const GaugeShapes = {
  horizontalBullet: 'horizontalBullet',
  verticalBullet: 'verticalBullet',
} as const;

export const GaugeTicksPositions = {
  auto: 'auto',
  bands: 'bands',
} as const;

export const GaugeTitleModes = {
  auto: 'auto',
  custom: 'custom',
  none: 'none',
} as const;

export type GaugeType = 'gauge';
export type GaugeColorMode = 'none' | 'palette';
export type GaugeShape = keyof typeof GaugeShapes;
export type GaugeTitleMode = keyof typeof GaugeTitleModes;
export type GaugeTicksPosition = keyof typeof GaugeTicksPositions;

export interface SharedGaugeLayerState {
  metricAccessor?: string;
  minAccessor?: string;
  maxAccessor?: string;
  goalAccessor?: string;
  ticksPosition: GaugeTicksPosition;
  visTitleMode: GaugeTitleMode;
  visTitle?: string;
  subtitle?: string;
  colorMode?: GaugeColorMode;
  palette?: PaletteOutput<CustomPaletteParams>;
  shape: GaugeShape;
}

export type GaugeLayerState = SharedGaugeLayerState & {
  layerId: string;
  layerType: LayerType;
};

export type GaugeVisualizationState = GaugeLayerState & {
  shape: GaugeShape;
};

export type GaugeExpressionArgs = SharedGaugeLayerState & {
  title?: string;
  description?: string;
  shape: GaugeShape;
  colorMode: GaugeColorMode;
  palette: PaletteOutput<CustomPaletteState>;
};
