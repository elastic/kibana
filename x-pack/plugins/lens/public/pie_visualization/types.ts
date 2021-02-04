/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PaletteOutput } from 'src/plugins/charts/public';
import { LensMultiTable } from '../types';

export interface SharedPieLayerState {
  groups: string[];
  metric?: string;
  numberDisplay: 'hidden' | 'percent' | 'value';
  categoryDisplay: 'default' | 'inside' | 'hide';
  legendDisplay: 'default' | 'show' | 'hide';
  legendPosition?: 'left' | 'right' | 'top' | 'bottom';
  nestedLegend?: boolean;
  percentDecimals?: number;
}

export type PieLayerState = SharedPieLayerState & {
  layerId: string;
};

export interface PieVisualizationState {
  shape: 'donut' | 'pie' | 'treemap';
  layers: PieLayerState[];
  palette?: PaletteOutput;
}

export type PieExpressionArgs = SharedPieLayerState & {
  title?: string;
  description?: string;
  shape: 'pie' | 'donut' | 'treemap';
  hideLabels: boolean;
  palette: PaletteOutput;
};

export interface PieExpressionProps {
  data: LensMultiTable;
  args: PieExpressionArgs;
}
