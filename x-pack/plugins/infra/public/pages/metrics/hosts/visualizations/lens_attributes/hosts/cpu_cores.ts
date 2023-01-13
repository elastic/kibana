/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FilterStateStore } from '@kbn/es-query';
import {
  AvgIndexPatternColumn,
  DateHistogramIndexPatternColumn,
  FormulaIndexPatternColumn,
  MaxIndexPatternColumn,
  MathIndexPatternColumn,
  TermsIndexPatternColumn,
} from '@kbn/lens-plugin/public';
import { LensAttributes } from '../../../../../../types';

export const cpuCores: LensAttributes = {
  title: 'CPU Cores Usage',
  description: '',
  visualizationType: 'lnsXY',
  state: {
    visualization: {
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
      layers: [
        {
          layerId: '9a2989ac-1dee-4811-905c-af2df6981552',
          seriesType: 'line',
          accessors: ['6be96424-8c3f-4753-a1c3-c60dac3903fe'],
          yConfig: [],
          layerType: 'data',
          collapseFn: '',
          xAccessor: '5c429519-b784-46b3-810a-ebbb39bb0698',
          splitAccessor: 'e1f21c55-f20f-4e22-ab93-566a280970b6',
        },
      ],
      valuesInLegend: false,
      yLeftExtent: {
        mode: 'custom',
        lowerBound: 0,
        upperBound: 1.5,
      },
      emphasizeFitting: true,
      yTitle: '',
      xTitle: '',
      hideEndzones: true,
    },
    query: {
      query: '',
      language: 'kuery',
    },
    filters: [
      {
        $state: {
          store: FilterStateStore.APP_STATE,
        },
        meta: {
          alias: null,
          disabled: false,
          key: 'query',
          negate: false,
          type: 'custom',
          value: '{"bool":{"filter":[{"exists":{"field":"system.load.*"}}]}}',
        },
        query: {
          bool: {
            filter: [
              {
                exists: {
                  field: 'system.load.*',
                },
              },
            ],
          },
        },
      },
    ],
    datasourceStates: {
      formBased: {
        layers: {
          '9a2989ac-1dee-4811-905c-af2df6981552': {
            columns: {
              '5c429519-b784-46b3-810a-ebbb39bb0698': {
                label: '@timestamp',
                dataType: 'date',
                operationType: 'date_histogram',
                sourceField: '@timestamp',
                isBucketed: true,
                scale: 'interval',
                params: {
                  dropPartials: true,
                  includeEmptyRows: false,
                  interval: 'auto',
                },
              } as DateHistogramIndexPatternColumn,
              '6be96424-8c3f-4753-a1c3-c60dac3903feX0': {
                label: 'Part of CPU Cores Usage',
                dataType: 'number',
                operationType: 'average',
                sourceField: 'system.load.1',
                isBucketed: false,
                scale: 'ratio',
                filter: {
                  query: '',
                  language: 'kuery',
                },
                params: {
                  emptyAsNull: false,
                },
                customLabel: true,
              } as AvgIndexPatternColumn,
              '6be96424-8c3f-4753-a1c3-c60dac3903feX1': {
                label: 'Part of CPU Cores Usage',
                dataType: 'number',
                operationType: 'max',
                sourceField: 'system.load.cores',
                isBucketed: false,
                scale: 'ratio',
                filter: {
                  query: '',
                  language: 'kuery',
                },
                params: {
                  emptyAsNull: false,
                },
                customLabel: true,
              } as MaxIndexPatternColumn,
              '6be96424-8c3f-4753-a1c3-c60dac3903feX2': {
                label: 'Part of CPU Cores Usage',
                dataType: 'number',
                operationType: 'math',
                isBucketed: false,
                scale: 'ratio',
                params: {
                  tinymathAst: {
                    type: 'function',
                    name: 'divide',
                    args: [
                      '6be96424-8c3f-4753-a1c3-c60dac3903feX0',
                      '6be96424-8c3f-4753-a1c3-c60dac3903feX1',
                    ] as any,
                    location: {
                      min: 0,
                      max: 47,
                    },
                    text: 'average(system.load.1) / max(system.load.cores)',
                  },
                },
                references: [
                  '6be96424-8c3f-4753-a1c3-c60dac3903feX0',
                  '6be96424-8c3f-4753-a1c3-c60dac3903feX1',
                ],
                customLabel: true,
              } as MathIndexPatternColumn,
              '6be96424-8c3f-4753-a1c3-c60dac3903fe': {
                label: 'CPU Cores Usage',
                dataType: 'number',
                operationType: 'formula',
                isBucketed: false,
                scale: 'ratio',
                params: {
                  formula: 'average(system.load.1) / max(system.load.cores)',
                  isFormulaBroken: false,
                  format: {
                    id: 'percent',
                    params: {
                      decimals: 0,
                    },
                  },
                },
                references: ['6be96424-8c3f-4753-a1c3-c60dac3903feX2'],
                customLabel: true,
              } as FormulaIndexPatternColumn,
              'e1f21c55-f20f-4e22-ab93-566a280970b6': {
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
                    label: 'Maximum of system.load.1',
                    dataType: 'number',
                    operationType: 'max',
                    sourceField: 'system.load.1',
                    isBucketed: false,
                    scale: 'ratio',
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
              'e1f21c55-f20f-4e22-ab93-566a280970b6',
              '5c429519-b784-46b3-810a-ebbb39bb0698',
              '6be96424-8c3f-4753-a1c3-c60dac3903fe',
              '6be96424-8c3f-4753-a1c3-c60dac3903feX0',
              '6be96424-8c3f-4753-a1c3-c60dac3903feX1',
              '6be96424-8c3f-4753-a1c3-c60dac3903feX2',
            ],
            incompleteColumns: {},
            sampling: 1,
          },
        },
      },
    },
  },
  references: [
    {
      type: 'index-pattern',
      id: '{dataViewId}',
      name: 'indexpattern-datasource-layer-9a2989ac-1dee-4811-905c-af2df6981552',
    },
  ],
};
