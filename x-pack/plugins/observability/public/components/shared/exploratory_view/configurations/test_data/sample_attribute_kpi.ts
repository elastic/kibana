/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export const sampleAttributeKpi = {
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
                sourceField: '@timestamp',
                dataType: 'date',
                isBucketed: true,
                label: '@timestamp',
                operationType: 'date_histogram',
                params: { interval: 'auto' },
                scale: 'interval',
              },
              'y-axis-column-layer0': {
                dataType: 'number',
                isBucketed: false,
                label: 'Page views',
                operationType: 'count',
                scale: 'ratio',
                sourceField: 'Records',
                filter: {
                  query: 'transaction.type: page-load and processor.event: transaction',
                  language: 'kuery',
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
          layerType: 'data',
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
