/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HeatmapGridConfigResult } from './heatmap_grid';
import { HeatmapLegendConfigResult } from './heatmap_legend';

export type ChartShapes = 'heatmap';

export interface SharedHeatmapLayerState {
  shape: ChartShapes;
  xAccessor?: string;
  yAccessor?: string;
  valueAccessor?: string;
  legend: HeatmapLegendConfigResult;
  gridConfig: HeatmapGridConfigResult;
}
