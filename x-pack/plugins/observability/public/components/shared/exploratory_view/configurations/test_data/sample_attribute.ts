/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export const sampleAttribute = {
  title: 'Prefilled from exploratory view app',
  description: '',
  visualizationType: 'lnsXY',
  references: [
    { id: 'apm-*', name: 'indexpattern-datasource-current-indexpattern', type: 'index-pattern' },
    { id: 'apm-*', name: 'indexpattern-datasource-layer-layer1', type: 'index-pattern' },
  ],
  state: {
    datasourceStates: {
      indexpattern: {
        layers: {
          layer1: {
            columnOrder: ['x-axis-column', 'y-axis-column'],
            columns: {
              'x-axis-column': {
                sourceField: 'transaction.duration.us',
                label: 'Page load time',
                dataType: 'number',
                operationType: 'range',
                isBucketed: true,
                scale: 'interval',
                params: {
                  type: 'histogram',
                  ranges: [{ from: 0, to: 1000, label: '' }],
                  maxBars: 'auto',
                },
              },
              'y-axis-column': {
                dataType: 'number',
                isBucketed: false,
                label: 'Pages loaded',
                operationType: 'count',
                scale: 'ratio',
                sourceField: 'Records',
              },
            },
            incompleteColumns: {},
          },
        },
      },
    },
    visualization: {
      legend: { isVisible: true, position: 'right' },
      valueLabels: 'hide',
      fittingFunction: 'Linear',
      curveType: 'CURVE_MONOTONE_X',
      axisTitlesVisibilitySettings: { x: true, yLeft: true, yRight: true },
      tickLabelsVisibilitySettings: { x: true, yLeft: true, yRight: true },
      gridlinesVisibilitySettings: { x: true, yLeft: true, yRight: true },
      preferredSeriesType: 'line',
      layers: [
        {
          accessors: ['y-axis-column'],
          layerId: 'layer1',
          seriesType: 'line',
          yConfig: [{ forAccessor: 'y-axis-column', color: 'green' }],
          xAccessor: 'x-axis-column',
        },
      ],
    },
    query: { query: '', language: 'kuery' },
    filters: [
      { meta: { index: 'apm-*' }, query: { match_phrase: { 'transaction.type': 'page-load' } } },
      { meta: { index: 'apm-*' }, query: { match_phrase: { 'processor.event': 'transaction' } } },
    ],
  },
};
