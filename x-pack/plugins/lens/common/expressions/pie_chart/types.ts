/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PaletteOutput } from '../../../../../../src/plugins/charts/common';
import type { LensMultiTable, LayerType } from '../../types';

export type PieChartTypes = 'donut' | 'pie' | 'treemap' | 'mosaic' | 'waffle';

export interface SharedPieLayerState {
  groups: string[];
  metric?: string;
  numberDisplay: 'hidden' | 'percent' | 'value';
  categoryDisplay: 'default' | 'inside' | 'hide';
  legendDisplay: 'default' | 'show' | 'hide';
  legendPosition?: 'left' | 'right' | 'top' | 'bottom';
  showValuesInLegend?: boolean;
  nestedLegend?: boolean;
  percentDecimals?: number;
  emptySizeRatio?: number;
  legendMaxLines?: number;
  truncateLegend?: boolean;
}

export type PieLayerState = SharedPieLayerState & {
  layerId: string;
  layerType: LayerType;
};

export interface PieVisualizationState {
  shape: PieChartTypes;
  layers: PieLayerState[];
  palette?: PaletteOutput;
}

export type PieExpressionArgs = SharedPieLayerState & {
  title?: string;
  description?: string;
  shape: PieChartTypes;
  hideLabels: boolean;
  palette: PaletteOutput;
};

export interface PieExpressionProps {
  data: LensMultiTable;
  args: PieExpressionArgs;
}
