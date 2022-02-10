/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GaugeState } from '../../../../../../src/plugins/chart_expressions/expression_gauge/common';
import { LayerType } from '../../../common/';

export const LENS_GAUGE_ID = 'lnsGauge';

export const GROUP_ID = {
  METRIC: 'metric',
  MIN: 'min',
  MAX: 'max',
  GOAL: 'goal',
} as const;

export type GaugeVisualizationState = GaugeState & {
  layerId: string;
  layerType: LayerType;
};
