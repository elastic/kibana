/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AxisExtentConfigResult, AxisTitlesVisibilityConfigResult } from './axis_config';
import type { FittingFunction } from './fitting_function';
import type { GridlinesConfigResult } from './grid_lines_config';
import type { LayerArgs } from './layer_config';
import type { LegendConfigResult } from './legend_config';
import type { TickLabelsConfigResult } from './tick_labels_config';
import type { LabelsOrientationConfigResult } from './labels_orientation_config';

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
  labelsOrientation?: LabelsOrientationConfigResult;
  curveType?: XYCurveType;
  fillOpacity?: number;
  hideEndzones?: boolean;
  valuesInLegend?: boolean;
}
