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
  MathIndexPatternColumn,
  MaxIndexPatternColumn,
  TermsIndexPatternColumn,
} from '@kbn/lens-plugin/public';
import { LensAttributes } from '../../../../../../types';

export const tx: LensAttributes = {
  title: 'Network Outbound (TX)',
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
          layerId: '5a2da42a-b8f3-4462-bb73-55f23275e118',
          accessors: ['ad3b61d1-d2b2-416c-b5ae-e034c3c111b7'],
          position: 'top',
          seriesType: 'line',
          showGridlines: false,
          layerType: 'data',
          xAccessor: '0bab0196-b2fc-4154-8b81-729270409b8c',
          splitAccessor: 'cc38b286-dc51-46b3-b3e0-81c5c9888949',
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
          '5a2da42a-b8f3-4462-bb73-55f23275e118': {
            columns: {
              'cc38b286-dc51-46b3-b3e0-81c5c9888949': {
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
                    label: 'Maximum of host.network.egress.bytes',
                    dataType: 'number',
                    operationType: 'max',
                    sourceField: 'host.network.egress.bytes',
                    isBucketed: false,
                    scale: 'ratio',
                    params: {
                      emptyAsNull: true,
                    },
                  },
                  orderDirection: 'desc',
                  otherBucket: true,
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
              '0bab0196-b2fc-4154-8b81-729270409b8c': {
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
              'ad3b61d1-d2b2-416c-b5ae-e034c3c111b7X0': {
                label:
                  'Part of average(host.network.egress.bytes) / (max(metricset.period) / 1000)',
                dataType: 'number',
                operationType: 'average',
                sourceField: 'host.network.egress.bytes',
                isBucketed: false,
                scale: 'ratio',
                filter: {
                  query: 'host.network.egress.bytes: *',
                  language: 'kuery',
                },
                params: {
                  emptyAsNull: false,
                },
                customLabel: true,
              } as AvgIndexPatternColumn,
              'ad3b61d1-d2b2-416c-b5ae-e034c3c111b7X1': {
                label:
                  'Part of average(host.network.egress.bytes) / (max(metricset.period) / 1000)',
                dataType: 'number',
                operationType: 'max',
                sourceField: 'metricset.period',
                isBucketed: false,
                scale: 'ratio',
                params: {
                  emptyAsNull: false,
                },
                customLabel: true,
              } as MaxIndexPatternColumn,
              'ad3b61d1-d2b2-416c-b5ae-e034c3c111b7X2': {
                label:
                  'Part of average(host.network.egress.bytes) / (max(metricset.period) / 1000)',
                dataType: 'number',
                operationType: 'math',
                isBucketed: false,
                scale: 'ratio',
                params: {
                  tinymathAst: {
                    type: 'function',
                    name: 'divide',
                    args: [
                      'ad3b61d1-d2b2-416c-b5ae-e034c3c111b7X0',
                      {
                        type: 'function',
                        name: 'divide',
                        args: ['ad3b61d1-d2b2-416c-b5ae-e034c3c111b7X1', 1000],
                        location: {
                          min: 39,
                          max: 67,
                        },
                        text: 'max(metricset.period) / 1000',
                      },
                    ],
                    location: {
                      min: 0,
                      max: 68,
                    },
                    text: 'average(host.network.egress.bytes) / (max(metricset.period) / 1000)',
                  },
                },
                references: [
                  'ad3b61d1-d2b2-416c-b5ae-e034c3c111b7X0',
                  'ad3b61d1-d2b2-416c-b5ae-e034c3c111b7X1',
                ],
                customLabel: true,
              } as MathIndexPatternColumn,
              'ad3b61d1-d2b2-416c-b5ae-e034c3c111b7': {
                label: 'average(host.network.egress.bytes) / (max(metricset.period) / 1000)',
                dataType: 'number',
                operationType: 'formula',
                isBucketed: false,
                scale: 'ratio',
                params: {
                  formula: 'average(host.network.egress.bytes) / (max(metricset.period) / 1000)',
                  isFormulaBroken: false,
                  format: {
                    id: 'bits',
                    params: {
                      decimals: 1,
                    },
                  },
                },
                references: ['ad3b61d1-d2b2-416c-b5ae-e034c3c111b7X2'],
              } as FormulaIndexPatternColumn,
            },
            columnOrder: [
              'cc38b286-dc51-46b3-b3e0-81c5c9888949',
              '0bab0196-b2fc-4154-8b81-729270409b8c',
              'ad3b61d1-d2b2-416c-b5ae-e034c3c111b7',
              'ad3b61d1-d2b2-416c-b5ae-e034c3c111b7X0',
              'ad3b61d1-d2b2-416c-b5ae-e034c3c111b7X1',
              'ad3b61d1-d2b2-416c-b5ae-e034c3c111b7X2',
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
      name: 'indexpattern-datasource-layer-5a2da42a-b8f3-4462-bb73-55f23275e118',
    },
  ],
};
