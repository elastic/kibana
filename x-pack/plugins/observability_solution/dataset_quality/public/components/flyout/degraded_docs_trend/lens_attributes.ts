/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataView } from '@kbn/data-views-plugin/common';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';

import { DEFAULT_LOGS_DATA_VIEW } from '../../../../common/constants';
import {
  flyoutDegradedDocsPercentageText,
  flyoutDegradedDocsTrendText,
} from '../../../../common/translations';

const defaultDataView = {
  id: `${DEFAULT_LOGS_DATA_VIEW}-id`,
  title: DEFAULT_LOGS_DATA_VIEW,
  timeFieldName: '@timestamp',
} as DataView;

export function getLensAttributes(color: string, dataView: DataView = defaultDataView) {
  return {
    visualizationType: 'lnsXY',
    title: flyoutDegradedDocsTrendText,
    references: [
      {
        id: dataView.id!,
        name: 'indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: dataView.id!,
        name: 'indexpattern-datasource-layer-layer1',
        type: 'index-pattern',
      },
    ],
    state: {
      datasourceStates: {
        formBased: {
          layers: {
            layer1: {
              columnOrder: ['col1', 'col2X0', 'col2X1', 'col2X2', 'col2'],
              columns: {
                col1: {
                  dataType: 'date',
                  isBucketed: true,
                  label: '@timestamp',
                  operationType: 'date_histogram',
                  params: {
                    interval: 'auto',
                  },
                  scale: 'interval',
                  sourceField: '@timestamp',
                },
                col2X0: {
                  label: '',
                  dataType: 'number',
                  operationType: 'count',
                  isBucketed: false,
                  scale: 'ratio',
                  sourceField: '___records___',
                  filter: {
                    query: '_ignored: *',
                    language: 'kuery',
                  },
                  params: {
                    emptyAsNull: false,
                  },
                  customLabel: true,
                },
                col2X1: {
                  label: '',
                  dataType: 'number',
                  operationType: 'count',
                  isBucketed: false,
                  scale: 'ratio',
                  sourceField: '___records___',
                  params: {
                    emptyAsNull: false,
                  },
                  customLabel: true,
                },
                col2X2: {
                  label: '',
                  dataType: 'number',
                  operationType: 'math',
                  isBucketed: false,
                  scale: 'ratio',
                  params: {
                    tinymathAst: {
                      type: 'function',
                      name: 'divide',
                      args: ['col2X0', 'col2X1'],
                      location: {
                        min: 0,
                        max: 34,
                      },
                      text: "count(kql='_ignored: *') / count()",
                    },
                  },
                  references: ['col2X0', 'col2X1'],
                  customLabel: true,
                },
                col2: {
                  label: flyoutDegradedDocsPercentageText,
                  customLabel: true,
                  operationType: 'formula',
                  dataType: 'number',
                  references: ['col2X2'],
                  isBucketed: false,
                  params: {
                    formula: "count(kql='_ignored: *') / count()",
                    format: {
                      id: 'percent',
                      params: {
                        decimals: 3,
                      },
                    },
                    isFormulaBroken: false,
                  },
                },
              },
              indexPatternId: dataView.id!,
            },
          },
        },
      },
      filters: [],
      query: {
        language: 'kuery',
        query: '',
      },
      visualization: {
        axisTitlesVisibilitySettings: {
          x: false,
          yLeft: false,
          yRight: false,
        },
        fittingFunction: 'None',
        gridlinesVisibilitySettings: {
          x: true,
          yLeft: true,
          yRight: true,
        },
        layers: [
          {
            accessors: ['col2'],
            layerId: 'layer1',
            layerType: 'data',
            seriesType: 'line',
            xAccessor: 'col1',
            yConfig: [
              {
                forAccessor: 'col2',
                color,
              },
            ],
          },
        ],
        legend: {
          isVisible: false,
          position: 'right',
        },
        preferredSeriesType: 'line',
        tickLabelsVisibilitySettings: {
          x: true,
          yLeft: true,
          yRight: true,
        },
        valueLabels: 'hide',
        yLeftExtent: {
          mode: 'custom',
          lowerBound: 0,
          upperBound: undefined,
        },
      },
    },
  } as TypedLensByValueInput['attributes'];
}
