/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GaugeState as GaugeStateOriginal } from '@kbn/expression-gauge-plugin/common';
import { LayerType } from '../../../common';

export const LENS_GAUGE_ID = 'lnsGauge';

export const GROUP_ID = {
  METRIC: 'metric',
  MIN: 'min',
  MAX: 'max',
  GOAL: 'goal',
} as const;

type GaugeState = Omit<GaugeStateOriginal, 'metric' | 'goal' | 'min' | 'max'> & {
  metricAccessor?: string;
  minAccessor?: string;
  maxAccessor?: string;
  goalAccessor?: string;
};

export type GaugeVisualizationState = GaugeState & {
  layerId: string;
  layerType: LayerType;
};

export type GaugeExpressionState = GaugeStateOriginal & {
  layerId: string;
  layerType: LayerType;
};
