/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AvgIndexPatternColumn,
  DateHistogramIndexPatternColumn,
  FormulaIndexPatternColumn,
  TermsIndexPatternColumn,
  MaxIndexPatternColumn,
  MathIndexPatternColumn,
} from '@kbn/lens-plugin/public';
import { LensAttributes } from '../../../../../../types';

export const memory: LensAttributes = {
  title: 'Memory Usage',
  description: '',
  visualizationType: 'lnsXY',
  state: {
    visualization: {
      legend: {
        isVisible: false,
        position: 'right',
        showSingleSeries: false,
      },
      valueLabels: 'hide',
      fittingFunction: 'None',
      curveType: 'LINEAR',
      xTitle: '',
      yTitle: '',
      valuesInLegend: false,
      yLeftExtent: {
        mode: 'custom',
        lowerBound: 0,
        upperBound: 1,
      },
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
      layers: [
        {
          layerId: '182dbed0-bae5-4280-b4e7-a7bde098c31d',
          accessors: ['a4386e18-b82f-4fd7-a86f-37e7a96bb5ea'],
          position: 'top',
          seriesType: 'line',
          showGridlines: false,
          layerType: 'data',
          xAccessor: '32f50636-84e6-4a04-9a54-02e5093906bc',
          splitAccessor: '8bfdae5f-edf9-4ef4-bdda-258ccfe65455',
        },
      ],
    },
    query: {
      query: '',
      language: 'kuery',
    },
    filters: [],
    datasourceStates: {
      formBased: {
        layers: {
          '182dbed0-bae5-4280-b4e7-a7bde098c31d': {
            columns: {
              '32f50636-84e6-4a04-9a54-02e5093906bc': {
                label: '@timestamp',
                dataType: 'date',
                operationType: 'date_histogram',
                sourceField: '@timestamp',
                isBucketed: true,
                scale: 'interval',
                params: {
                  interval: 'auto',
                  includeEmptyRows: true,
                  dropPartials: false,
                },
              } as DateHistogramIndexPatternColumn,
              'a4386e18-b82f-4fd7-a86f-37e7a96bb5eaX0': {
                label:
                  'Part of average(system.memory.actual.used.bytes) / max(system.memory.total)',
                dataType: 'number',
                operationType: 'average',
                sourceField: 'system.memory.actual.used.bytes',
                isBucketed: false,
                scale: 'ratio',
                params: {
                  emptyAsNull: false,
                },
                customLabel: true,
              } as AvgIndexPatternColumn,
              'a4386e18-b82f-4fd7-a86f-37e7a96bb5eaX1': {
                label:
                  'Part of average(system.memory.actual.used.bytes) / max(system.memory.total)',
                dataType: 'number',
                operationType: 'max',
                sourceField: 'system.memory.total',
                isBucketed: false,
                scale: 'ratio',
                params: {
                  emptyAsNull: false,
                },
                customLabel: true,
              } as MaxIndexPatternColumn,
              'a4386e18-b82f-4fd7-a86f-37e7a96bb5eaX2': {
                label:
                  'Part of average(system.memory.actual.used.bytes) / max(system.memory.total)',
                dataType: 'number',
                operationType: 'math',
                isBucketed: false,
                scale: 'ratio',
                params: {
                  tinymathAst: {
                    type: 'function',
                    name: 'divide',
                    args: [
                      'a4386e18-b82f-4fd7-a86f-37e7a96bb5eaX0',
                      'a4386e18-b82f-4fd7-a86f-37e7a96bb5eaX1',
                    ] as any,
                    location: {
                      min: 0,
                      max: 67,
                    },
                    text: 'average(system.memory.actual.used.bytes) / max(system.memory.total)',
                  },
                },
                references: [
                  'a4386e18-b82f-4fd7-a86f-37e7a96bb5eaX0',
                  'a4386e18-b82f-4fd7-a86f-37e7a96bb5eaX1',
                ],
                customLabel: true,
              } as MathIndexPatternColumn,
              'a4386e18-b82f-4fd7-a86f-37e7a96bb5ea': {
                label: 'average(system.memory.actual.used.bytes) / max(system.memory.total)',
                dataType: 'number',
                operationType: 'formula',
                isBucketed: false,
                scale: 'ratio',
                params: {
                  formula: 'average(system.memory.actual.used.bytes) / max(system.memory.total)',
                  isFormulaBroken: false,
                  format: {
                    id: 'percent',
                    params: {
                      decimals: 0,
                    },
                  },
                },
                references: ['a4386e18-b82f-4fd7-a86f-37e7a96bb5eaX2'],
              } as FormulaIndexPatternColumn,
              '8bfdae5f-edf9-4ef4-bdda-258ccfe65455': {
                label: 'Top 20 values of host.name',
                dataType: 'string',
                operationType: 'terms',
                scale: 'ordinal',
                sourceField: 'host.name',
                isBucketed: true,
                params: {
                  size: 20,
                  orderBy: {
                    type: 'custom',
                  },
                  orderAgg: {
                    label: 'Maximum of system.memory.actual.used.bytes',
                    dataType: 'number',
                    operationType: 'max',
                    sourceField: 'system.memory.actual.used.bytes',
                    isBucketed: false,
                    scale: 'ratio',
                    params: {
                      emptyAsNull: true,
                    },
                  },
                  orderDirection: 'desc',
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
            },
            columnOrder: [
              '8bfdae5f-edf9-4ef4-bdda-258ccfe65455',
              '32f50636-84e6-4a04-9a54-02e5093906bc',
              'a4386e18-b82f-4fd7-a86f-37e7a96bb5ea',
              'a4386e18-b82f-4fd7-a86f-37e7a96bb5eaX0',
              'a4386e18-b82f-4fd7-a86f-37e7a96bb5eaX1',
              'a4386e18-b82f-4fd7-a86f-37e7a96bb5eaX2',
            ],
            sampling: 1,
            incompleteColumns: {},
          },
        },
      },
    },
  },
  references: [
    {
      type: 'index-pattern',
      id: '{dataViewId}',
      name: 'indexpattern-datasource-layer-182dbed0-bae5-4280-b4e7-a7bde098c31d',
    },
  ],
};
