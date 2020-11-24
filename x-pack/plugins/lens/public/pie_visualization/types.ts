/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PaletteOutput } from 'src/plugins/charts/public';
import { LensMultiTable } from '../types';

export interface SharedLayerState {
  groups: string[];
  metric?: string;
  numberDisplay: 'hidden' | 'percent' | 'value';
  categoryDisplay: 'default' | 'inside' | 'hide';
  legendDisplay: 'default' | 'show' | 'hide';
  legendPosition?: 'left' | 'right' | 'top' | 'bottom';
  nestedLegend?: boolean;
  percentDecimals?: number;
}

export type LayerState = SharedLayerState & {
  layerId: string;
};

export interface PieVisualizationState {
  shape: 'donut' | 'pie' | 'treemap';
  layers: LayerState[];
  palette?: PaletteOutput;
}

export type PieExpressionArgs = SharedLayerState & {
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
