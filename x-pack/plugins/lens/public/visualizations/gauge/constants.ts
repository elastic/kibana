/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  GaugeShape,
  GaugeShapes,
  GaugeState as GaugeStateOriginal,
} from '@kbn/expression-gauge-plugin/common';
import { i18n } from '@kbn/i18n';
import type { LayerType } from '../../../common/types';

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

export const gaugeTitlesByType: Record<GaugeShape, string> = {
  [GaugeShapes.HORIZONTAL_BULLET]: i18n.translate('xpack.lens.gaugeHorizontal.gaugeLabel', {
    defaultMessage: 'Horizontal Bullet',
  }),
  [GaugeShapes.VERTICAL_BULLET]: i18n.translate('xpack.lens.gaugeVertical.gaugeLabel', {
    defaultMessage: 'Vertical Bullet',
  }),
  [GaugeShapes.SEMI_CIRCLE]: i18n.translate('xpack.lens.gaugeSemiCircle.gaugeLabel', {
    defaultMessage: 'Minor arc',
  }),
  [GaugeShapes.ARC]: i18n.translate('xpack.lens.gaugeArc.gaugeLabel', {
    defaultMessage: 'Major arc',
  }),
  [GaugeShapes.CIRCLE]: i18n.translate('xpack.lens.gaugeCircle.gaugeLabel', {
    defaultMessage: 'Circle',
  }),
};
