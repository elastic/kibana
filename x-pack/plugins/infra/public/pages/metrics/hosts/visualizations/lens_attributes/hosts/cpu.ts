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
} from '@kbn/lens-plugin/public';
import { LensAttributes } from '../../../../../../types';

export const cpu: LensAttributes = {
  title: 'CPU Usage',
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
          layerId: 'daaa0143-8869-4d82-b2ae-b158a7d53232',
          accessors: ['2dae0d90-c090-44ac-a3e1-3786f5958799'],
          position: 'top',
          seriesType: 'line',
          showGridlines: false,
          layerType: 'data',
          xAccessor: 'a9529aea-6749-48ac-93cc-0ffdd273c533',
          splitAccessor: 'fc5227d2-4389-47bd-98d3-1d1b5d8d1e4b',
        },
      ],
      yTitle: '',
      xTitle: '',
    },
    query: {
      query: '',
      language: 'kuery',
    },
    filters: [],
    datasourceStates: {
      formBased: {
        layers: {
          'daaa0143-8869-4d82-b2ae-b158a7d53232': {
            columns: {
              '2dae0d90-c090-44ac-a3e1-3786f5958799': {
                label: 'average(system.cpu.total.norm.pct)',
                dataType: 'number',
                operationType: 'formula',
                isBucketed: false,
                scale: 'ratio',
                params: {
                  formula: 'average(system.cpu.total.norm.pct)',
                  isFormulaBroken: false,
                  format: {
                    id: 'percent',
                    params: {
                      decimals: 0,
                    },
                  },
                },
                references: ['2dae0d90-c090-44ac-a3e1-3786f5958799X0'],
              } as FormulaIndexPatternColumn,
              '2dae0d90-c090-44ac-a3e1-3786f5958799X0': {
                label: 'Part of average(system.cpu.total.norm.pct)',
                dataType: 'number',
                operationType: 'average',
                sourceField: 'system.cpu.total.norm.pct',
                isBucketed: false,
                scale: 'ratio',
                params: {
                  emptyAsNull: false,
                },
                customLabel: true,
              } as AvgIndexPatternColumn,
              'a9529aea-6749-48ac-93cc-0ffdd273c533': {
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
              'fc5227d2-4389-47bd-98d3-1d1b5d8d1e4b': {
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
                    label: '95th percentile of system.cpu.total.norm.pct',
                    dataType: 'number',
                    operationType: 'max',
                    sourceField: 'system.cpu.total.norm.pct',
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
              'fc5227d2-4389-47bd-98d3-1d1b5d8d1e4b',
              'a9529aea-6749-48ac-93cc-0ffdd273c533',
              '2dae0d90-c090-44ac-a3e1-3786f5958799',
              '2dae0d90-c090-44ac-a3e1-3786f5958799X0',
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
      name: 'indexpattern-datasource-layer-daaa0143-8869-4d82-b2ae-b158a7d53232',
    },
  ],
};
