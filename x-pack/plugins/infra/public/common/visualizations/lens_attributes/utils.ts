/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { XYState } from '@kbn/lens-plugin/public';

export const DEFAULT_LAYER_ID = 'layer1';
export const getXYVisualizationState = (
  custom: Omit<Partial<XYState>, 'layers'> & { layers: XYState['layers'] }
): XYState => ({
  legend: {
    isVisible: false,
    position: 'right',
    showSingleSeries: false,
  },
  valueLabels: 'show',
  fittingFunction: 'None',
  curveType: 'LINEAR',
  yLeftScale: 'linear',
  axisTitlesVisibilitySettings: {
    x: false,
    yLeft: false,
    yRight: true,
  },
  tickLabelsVisibilitySettings: {
    x: true,
    yLeft: true,
    yRight: true,
  },
  labelsOrientation: {
    x: 0,
    yLeft: 0,
    yRight: 0,
  },
  gridlinesVisibilitySettings: {
    x: true,
    yLeft: true,
    yRight: true,
  },
  preferredSeriesType: 'line',
  valuesInLegend: false,
  emphasizeFitting: true,
  yTitle: '',
  xTitle: '',
  hideEndzones: true,
  ...custom,
});
