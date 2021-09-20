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
            columnOrder: [
              'x-axis-column-layer0',
              'y-axis-column-layer0',
              'y-axis-column-layer0X0',
              'y-axis-column-layer0X1',
              'y-axis-column-layer0X2',
              'y-axis-column-layer0X3',
              'y-axis-column-layer0X4',
            ],
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
                filter: {
                  language: 'kuery',
                  query:
                    'transaction.type: page-load and processor.event: transaction and transaction.type : *',
                },
                isBucketed: false,
                label: 'Pages loaded',
                operationType: 'formula',
                params: {
                  format: {
                    id: 'percent',
                    params: {
                      decimals: 0,
                    },
                  },
                  formula:
                    "count(kql='transaction.type: page-load and processor.event: transaction and transaction.type : *') / overall_sum(count(kql='transaction.type: page-load and processor.event: transaction and transaction.type : *'))",
                  isFormulaBroken: false,
                },
                references: ['y-axis-column-layer0X4'],
                scale: 'ratio',
              },
              'y-axis-column-layer0X0': {
                customLabel: true,
                dataType: 'number',
                filter: {
                  language: 'kuery',
                  query:
                    'transaction.type: page-load and processor.event: transaction and transaction.type : *',
                },
                isBucketed: false,
                label: 'Part of count() / overall_sum(count())',
                operationType: 'count',
                scale: 'ratio',
                sourceField: 'Records',
              },
              'y-axis-column-layer0X1': {
                customLabel: true,
                dataType: 'number',
                isBucketed: false,
                label: 'Part of count() / overall_sum(count())',
                operationType: 'count',
                scale: 'ratio',
                sourceField: 'Records',
                filter: {
                  language: 'kuery',
                  query:
                    'transaction.type: page-load and processor.event: transaction and transaction.type : *',
                },
              },
              'y-axis-column-layer0X2': {
                customLabel: true,
                dataType: 'number',
                isBucketed: false,
                label: 'Part of count() / overall_sum(count())',
                operationType: 'math',
                params: {
                  tinymathAst: 'y-axis-column-layer0X1',
                },
                references: ['y-axis-column-layer0X1'],
                scale: 'ratio',
              },
              'y-axis-column-layer0X3': {
                customLabel: true,
                dataType: 'number',
                isBucketed: false,
                label: 'Part of count() / overall_sum(count())',
                operationType: 'overall_sum',
                references: ['y-axis-column-layer0X2'],
                scale: 'ratio',
              },
              'y-axis-column-layer0X4': {
                customLabel: true,
                dataType: 'number',
                isBucketed: false,
                label: 'Part of count() / overall_sum(count())',
                operationType: 'math',
                params: {
                  tinymathAst: {
                    args: ['y-axis-column-layer0X0', 'y-axis-column-layer0X3'],
                    location: {
                      max: 30,
                      min: 0,
                    },
                    name: 'divide',
                    text:
                      "count(kql='transaction.type: page-load and processor.event: transaction and transaction.type : *') / overall_sum(count(kql='transaction.type: page-load and processor.event: transaction and transaction.type : *'))",
                    type: 'function',
                  },
                },
                references: ['y-axis-column-layer0X0', 'y-axis-column-layer0X3'],
                scale: 'ratio',
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
    query: { query: 'transaction.duration.us < 60000000', language: 'kuery' },
    filters: [],
  },
};
