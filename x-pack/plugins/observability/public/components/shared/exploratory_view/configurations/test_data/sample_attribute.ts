/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { RECORDS_FIELD } from '../constants';

export const sampleAttribute = {
  description: '',
  references: [
    {
      id: 'apm-*',
      name: 'indexpattern-datasource-current-indexpattern',
      type: 'index-pattern',
    },
    {
      id: 'apm-*',
      name: 'indexpattern-datasource-layer-layer0',
      type: 'index-pattern',
    },
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
                dataType: 'number',
                isBucketed: true,
                label: 'Page load time',
                operationType: 'range',
                params: {
                  maxBars: 'auto',
                  ranges: [
                    {
                      from: 0,
                      label: '',
                      to: 1000,
                    },
                  ],
                  type: 'histogram',
                },
                scale: 'interval',
                sourceField: 'transaction.duration.us',
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
                sourceField: RECORDS_FIELD,
              },
              'y-axis-column-layer0X1': {
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
                sourceField: RECORDS_FIELD,
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
                    text: "count(kql='transaction.type: page-load and processor.event: transaction and transaction.type : *') / overall_sum(count(kql='transaction.type: page-load and processor.event: transaction and transaction.type : *'))",
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
    filters: [],
    query: {
      language: 'kuery',
      query:
        'transaction.type: page-load and processor.event: transaction and transaction.type : * and transaction.duration.us < 60000000',
    },
    visualization: {
      axisTitlesVisibilitySettings: {
        x: true,
        yLeft: true,
        yRight: true,
      },
      curveType: 'CURVE_MONOTONE_X',
      fittingFunction: 'Linear',
      gridlinesVisibilitySettings: {
        x: true,
        yLeft: true,
        yRight: true,
      },
      layers: [
        {
          accessors: ['y-axis-column-layer0'],
          layerId: 'layer0',
          layerType: 'data',
          seriesType: 'line',
          xAccessor: 'x-axis-column-layer0',
          yConfig: [
            {
              color: 'green',
              forAccessor: 'y-axis-column-layer0',
              axisMode: 'left',
            },
          ],
        },
      ],
      legend: {
        isVisible: true,
        showSingleSeries: true,
        position: 'right',
      },
      preferredSeriesType: 'line',
      tickLabelsVisibilitySettings: {
        x: true,
        yLeft: true,
        yRight: true,
      },
      valueLabels: 'hide',
    },
  },
  title: 'Prefilled from exploratory view app',
  visualizationType: 'lnsXY',
};
