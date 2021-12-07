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

export const EXPRESSION_GAUGE_NAME = 'lens_gauge';
export const GAUGE_FUNCTION_RENDERER_NAME = 'lens_gauge_renderer';

export const GaugeShapes = {
  horizontalBullet: 'horizontalBullet',
  verticalBullet: 'verticalBullet',
} as const;

export const GaugeTicksPositions = {
  auto: 'auto',
  bands: 'bands',
} as const;

export const GaugeLabelMajorModes = {
  auto: 'auto',
  custom: 'custom',
  none: 'none',
} as const;

export const GaugeColorModes = {
  palette: 'palette',
  none: 'none',
} as const;

export type GaugeColorMode = keyof typeof GaugeColorModes;
export type GaugeShape = keyof typeof GaugeShapes;
export type GaugeLabelMajorMode = keyof typeof GaugeLabelMajorModes;
export type GaugeTicksPosition = keyof typeof GaugeTicksPositions;

export interface SharedGaugeLayerState {
  metricAccessor?: string;
  minAccessor?: string;
  maxAccessor?: string;
  goalAccessor?: string;
  ticksPosition: GaugeTicksPosition;
  labelMajorMode: GaugeLabelMajorMode;
  labelMajor?: string;
  labelMinor?: string;
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

export type GaugeArguments = SharedGaugeLayerState & {
  title?: string;
  description?: string;
  shape: GaugeShape;
  colorMode: GaugeColorMode;
  palette?: PaletteOutput<CustomPaletteState>;
};
