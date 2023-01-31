/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  DateHistogramIndexPatternColumn,
  PersistedIndexPatternLayer,
  TermsIndexPatternColumn,
  XYState,
} from '@kbn/lens-plugin/public';

export const DEFAULT_LAYER_ID = 'layer1';

export const getHistogramColumn = (columnName: string, sourceField: string) => {
  return {
    [columnName]: {
      dataType: 'date',
      isBucketed: true,
      label: '@timestamp',
      operationType: 'date_histogram',
      params: { interval: 'auto' },
      scale: 'interval',
      sourceField,
    } as DateHistogramIndexPatternColumn,
  };
};

export const getBreakdownColumn = (
  columnName: string,
  sourceField: string,
  breakdownSize: number
): PersistedIndexPatternLayer['columns'] => {
  return {
    [columnName]: {
      label: `Top ${breakdownSize} values of ${sourceField}`,
      dataType: 'string',
      operationType: 'terms',
      scale: 'ordinal',
      sourceField,
      isBucketed: true,
      params: {
        size: breakdownSize,
        orderBy: {
          type: 'alphabetical',
          fallback: false,
        },
        orderDirection: 'asc',
        otherBucket: false,
        missingBucket: false,
        parentFormat: {
          id: 'terms',
        },
        include: [],
        exclude: [],
        includeIsRegex: false,
        excludeIsRegex: false,
      },
    } as TermsIndexPatternColumn,
  };
};

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
