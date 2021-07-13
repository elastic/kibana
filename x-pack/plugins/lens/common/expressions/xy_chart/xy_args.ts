/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AxisExtentConfigResult, AxisTitlesVisibilityConfigResult } from './axis_config';
import { FittingFunction } from './fitting_function';
import { GridlinesConfigResult } from './grid_lines_config';
import { LayerArgs } from './layer_config';
import { LegendConfigResult } from './legend_config';
import { TickLabelsConfigResult } from './tick_labels_config';

export type ValueLabelConfig = 'hide' | 'inside' | 'outside';

export type XYCurveType = 'LINEAR' | 'CURVE_MONOTONE_X';

// Arguments to XY chart expression, with computed properties
export interface XYArgs {
  title?: string;
  description?: string;
  xTitle: string;
  yTitle: string;
  yRightTitle: string;
  yLeftExtent: AxisExtentConfigResult;
  yRightExtent: AxisExtentConfigResult;
  legend: LegendConfigResult;
  valueLabels: ValueLabelConfig;
  layers: LayerArgs[];
  fittingFunction?: FittingFunction;
  axisTitlesVisibilitySettings?: AxisTitlesVisibilityConfigResult;
  tickLabelsVisibilitySettings?: TickLabelsConfigResult;
  gridlinesVisibilitySettings?: GridlinesConfigResult;
  curveType?: XYCurveType;
  fillOpacity?: number;
  hideEndzones?: boolean;
  valuesInLegend?: boolean;
}
