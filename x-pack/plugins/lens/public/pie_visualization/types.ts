/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaDatatableColumn } from 'src/plugins/expressions/public';
import { LensMultiTable } from '../types';

export interface LayerState {
  layerId: string;
  slices: string[];
  metric?: string;
}

export interface PieVisualizationState {
  shape: 'donut' | 'pie' | 'treemap';
  layers: LayerState[];
}

export interface PieExpressionArgs {
  slices: string[];
  metric?: string;
  shape: 'pie' | 'donut' | 'treemap';
  hideLabels: boolean;
}

export interface PieExpressionProps {
  data: LensMultiTable;
  args: PieExpressionArgs;
}

export type ColumnGroups = Array<{
  col: KibanaDatatableColumn;
  metrics: KibanaDatatableColumn[];
}>;
