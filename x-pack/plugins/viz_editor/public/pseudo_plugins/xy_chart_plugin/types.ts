/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Axis, VisModel } from '../..';

export const PLUGIN_NAME = 'xy_chart';

export type XyDisplayType = 'line' | 'area' | 'bar';

export interface XyChartPrivateState {
  xAxis: Axis;
  yAxis: Axis;
  seriesAxis: Axis;
  displayType?: XyDisplayType;
  stacked: boolean;
}

export type XyChartVisModel = VisModel<'xyChart', XyChartPrivateState>;
