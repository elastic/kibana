/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { mockDataView } from '../../rtl_helpers';
import { RECORDS_FIELD } from '../constants';

export const sampleAttribute = {
  description: '',
  references: [],
  state: {
    internalReferences: [
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
      {
        id: 'apm-*',
        name: 'indexpattern-datasource-layer-layer0-reference-lines',
        type: 'index-pattern',
      },
    ],
    adHocDataViews: { [mockDataView.title]: mockDataView.toSpec(false) },
    datasourceStates: {
      formBased: {
        layers: {
          layer0: {
            columnOrder: [
              'x-axis-column-layer0',
              'y-axis-column-layer0-0',
              'y-axis-column-layer0X0',
              'y-axis-column-layer0X1',
              'y-axis-column-layer0X2',
              'y-axis-column-layer0X3',
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
              'y-axis-column-layer0-0': {
                customLabel: true,
                dataType: 'number',
                filter: {
                  language: 'kuery',
                  query:
                    'transaction.type: page-load and processor.event: transaction and transaction.type : *',
                },
                isBucketed: false,
                label: 'test-series',
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
                references: ['y-axis-column-layer0X3'],
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
                label: 'Part of Pages loaded',
                operationType: 'count',
                params: {
                  emptyAsNull: false,
                },
                scale: 'ratio',
                sourceField: RECORDS_FIELD,
                timeScale: undefined,
                timeShift: undefined,
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
                label: 'Part of Pages loaded',
                operationType: 'count',
                params: {
                  emptyAsNull: false,
                },
                scale: 'ratio',
                sourceField: RECORDS_FIELD,
                timeScale: undefined,
                timeShift: undefined,
              },
              'y-axis-column-layer0X2': {
                customLabel: true,
                dataType: 'number',
                isBucketed: false,
                label: 'Part of Pages loaded',
                operationType: 'overall_sum',
                params: undefined,
                references: ['y-axis-column-layer0X1'],
                scale: 'ratio',
              },
              'y-axis-column-layer0X3': {
                customLabel: true,
                dataType: 'number',
                isBucketed: false,
                label: 'Part of Pages loaded',
                operationType: 'math',
                params: {
                  tinymathAst: {
                    args: ['y-axis-column-layer0X0', 'y-axis-column-layer0X2'],
                    location: {
                      max: 212,
                      min: 0,
                    },
                    name: 'divide',
                    text: "count(kql='transaction.type: page-load and processor.event: transaction and transaction.type : *') / overall_sum(count(kql='transaction.type: page-load and processor.event: transaction and transaction.type : *'))",
                    type: 'function',
                  },
                },
                references: ['y-axis-column-layer0X0', 'y-axis-column-layer0X2'],
                scale: 'ratio',
              },
            },
            incompleteColumns: {},
          },
          'layer0-reference-lines': {
            columnOrder: [
              '50th-percentile-reference-line-layer0-reference-lines',
              '75th-percentile-reference-line-layer0-reference-lines',
              '90th-percentile-reference-line-layer0-reference-lines',
              '95th-percentile-reference-line-layer0-reference-lines',
              '99th-percentile-reference-line-layer0-reference-lines',
            ],
            columns: {
              '50th-percentile-reference-line-layer0-reference-lines': {
                customLabel: true,
                dataType: 'number',
                isBucketed: false,
                label: '50th',
                operationType: 'percentile',
                params: {
                  percentile: 50,
                },
                scale: 'ratio',
                sourceField: 'transaction.duration.us',
              },
              '75th-percentile-reference-line-layer0-reference-lines': {
                customLabel: true,
                dataType: 'number',
                isBucketed: false,
                label: '75th',
                operationType: 'percentile',
                params: {
                  percentile: 75,
                },
                scale: 'ratio',
                sourceField: 'transaction.duration.us',
              },
              '90th-percentile-reference-line-layer0-reference-lines': {
                customLabel: true,
                dataType: 'number',
                isBucketed: false,
                label: '90th',
                operationType: 'percentile',
                params: {
                  percentile: 90,
                },
                scale: 'ratio',
                sourceField: 'transaction.duration.us',
              },
              '95th-percentile-reference-line-layer0-reference-lines': {
                customLabel: true,
                dataType: 'number',
                isBucketed: false,
                label: '95th',
                operationType: 'percentile',
                params: {
                  percentile: 95,
                },
                scale: 'ratio',
                sourceField: 'transaction.duration.us',
              },
              '99th-percentile-reference-line-layer0-reference-lines': {
                customLabel: true,
                dataType: 'number',
                isBucketed: false,
                label: '99th',
                operationType: 'percentile',
                params: {
                  percentile: 99,
                },
                scale: 'ratio',
                sourceField: 'transaction.duration.us',
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
        x: false,
        yLeft: true,
        yRight: true,
      },
      curveType: 'CURVE_MONOTONE_X',
      fittingFunction: 'Linear',
      gridlinesVisibilitySettings: {
        x: false,
        yLeft: true,
        yRight: true,
      },
      layers: [
        {
          accessors: ['y-axis-column-layer0-0'],
          layerId: 'layer0',
          layerType: 'data',
          palette: undefined,
          seriesType: 'line',
          xAccessor: 'x-axis-column-layer0',
          yConfig: [
            {
              color: 'green',
              forAccessor: 'y-axis-column-layer0-0',
              axisMode: 'left',
            },
          ],
        },
        {
          accessors: [
            '50th-percentile-reference-line-layer0-reference-lines',
            '75th-percentile-reference-line-layer0-reference-lines',
            '90th-percentile-reference-line-layer0-reference-lines',
            '95th-percentile-reference-line-layer0-reference-lines',
            '99th-percentile-reference-line-layer0-reference-lines',
          ],
          layerId: 'layer0-reference-lines',
          layerType: 'referenceLine',
          yConfig: [
            {
              axisMode: 'bottom',
              color: '#6092C0',
              forAccessor: '50th-percentile-reference-line-layer0-reference-lines',
              lineStyle: 'solid',
              lineWidth: 2,
              textVisibility: true,
            },
            {
              axisMode: 'bottom',
              color: '#6092C0',
              forAccessor: '75th-percentile-reference-line-layer0-reference-lines',
              lineStyle: 'solid',
              lineWidth: 2,
              textVisibility: true,
            },
            {
              axisMode: 'bottom',
              color: '#6092C0',
              forAccessor: '90th-percentile-reference-line-layer0-reference-lines',
              lineStyle: 'solid',
              lineWidth: 2,
              textVisibility: true,
            },
            {
              axisMode: 'bottom',
              color: '#6092C0',
              forAccessor: '95th-percentile-reference-line-layer0-reference-lines',
              lineStyle: 'solid',
              lineWidth: 2,
              textVisibility: true,
            },
            {
              axisMode: 'bottom',
              color: '#6092C0',
              forAccessor: '99th-percentile-reference-line-layer0-reference-lines',
              lineStyle: 'solid',
              lineWidth: 2,
              textVisibility: true,
            },
          ],
        },
      ],
      legend: {
        isVisible: true,
        position: 'right',
        showSingleSeries: true,
        legendSize: 'auto',
        shouldTruncate: false,
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
