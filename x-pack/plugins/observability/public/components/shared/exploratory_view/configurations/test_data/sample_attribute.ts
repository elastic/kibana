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
    { id: 'apm-*', name: 'indexpattern-datasource-layer-layer0', type: 'index-pattern' },
  ],
  state: {
    datasourceStates: {
      indexpattern: {
        layers: {
          layer0: {
            columnOrder: ['x-axis-column-layer0', 'y-axis-column-layer0'],
            columns: {
              'x-axis-column-layer0': {
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
              'y-axis-column-layer0': {
                dataType: 'number',
                isBucketed: false,
                label: 'Pages loaded',
                operationType: 'count',
                scale: 'ratio',
                sourceField: 'Records',
                filter: {
                  language: 'kuery',
                  query:
                    'transaction.type: page-load and processor.event: transaction and transaction.type : *',
                },
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
          accessors: ['y-axis-column-layer0'],
          layerId: 'layer0',
          seriesType: 'line',
          yConfig: [{ forAccessor: 'y-axis-column-layer0' }],
          xAccessor: 'x-axis-column-layer0',
        },
      ],
    },
    query: { query: '', language: 'kuery' },
    filters: [],
  },
};
