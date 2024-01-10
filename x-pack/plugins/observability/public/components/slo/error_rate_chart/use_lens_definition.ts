/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { ALL_VALUE, SLOResponse, timeslicesBudgetingMethodSchema } from '@kbn/slo-schema';
import { SLO_DESTINATION_INDEX_PATTERN } from '../../../../common/slo/constants';

export function useLensDefinition(slo: SLOResponse): TypedLensByValueInput['attributes'] {
  const { euiTheme } = useEuiTheme();

  const interval = timeslicesBudgetingMethodSchema.is(slo.budgetingMethod)
    ? slo.objective.timesliceWindow
    : '60s';

  return {
    title: 'SLO Error Rate',
    description: '',
    visualizationType: 'lnsXY',
    type: 'lens',
    references: [],
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
        preferredSeriesType: 'area',
        layers: [
          {
            layerId: '8730e8af-7dac-430e-9cef-3b9989ff0866',
            accessors: ['9f69a7b0-34b9-4b76-9ff7-26dc1a06ec14'],
            position: 'top',
            seriesType: 'area',
            showGridlines: false,
            layerType: 'data',
            xAccessor: '627ded04-eae0-4437-83a1-bbb6138d2c3b',
            yConfig: [
              {
                forAccessor: '9f69a7b0-34b9-4b76-9ff7-26dc1a06ec14',
                color: euiTheme.colors.danger,
              },
            ],
          },
          {
            layerId: '34298f84-681e-4fa3-8107-d6facb32ed92',
            layerType: 'referenceLine',
            accessors: [
              '0a42b72b-cd5a-4d59-81ec-847d97c268e6',
              '76d3bcc9-7d45-4b08-b2b1-8d3866ca0762',
              'c531a6b1-70dd-4918-bdd0-a21535a7af05',
              '61f9e663-10eb-41f7-b584-1f0f95418489',
            ],
            yConfig: [
              {
                forAccessor: '0a42b72b-cd5a-4d59-81ec-847d97c268e6',
                axisMode: 'left',
                textVisibility: true,
                color: euiTheme.colors.danger,
                iconPosition: 'right',
              },
              {
                forAccessor: '76d3bcc9-7d45-4b08-b2b1-8d3866ca0762',
                axisMode: 'left',
                textVisibility: true,
                color: euiTheme.colors.danger,
                iconPosition: 'right',
              },
              {
                forAccessor: 'c531a6b1-70dd-4918-bdd0-a21535a7af05',
                axisMode: 'left',
                textVisibility: true,
                color: euiTheme.colors.danger,
                iconPosition: 'right',
              },
              {
                forAccessor: '61f9e663-10eb-41f7-b584-1f0f95418489',
                axisMode: 'left',
                textVisibility: true,
                color: euiTheme.colors.danger,
                iconPosition: 'right',
              },
            ],
          },
        ],
      },
      query: {
        query: `slo.id : "${slo.id}" and slo.instanceId : "${slo.instanceId ?? ALL_VALUE}"`,
        language: 'kuery',
      },
      filters: [],
      datasourceStates: {
        formBased: {
          layers: {
            '8730e8af-7dac-430e-9cef-3b9989ff0866': {
              columns: {
                '627ded04-eae0-4437-83a1-bbb6138d2c3b': {
                  label: '@timestamp',
                  dataType: 'date',
                  operationType: 'date_histogram',
                  sourceField: '@timestamp',
                  isBucketed: true,
                  scale: 'interval',
                  params: {
                    // @ts-ignore
                    interval,
                    includeEmptyRows: true,
                    dropPartials: false,
                  },
                },
                ...(slo.budgetingMethod === 'occurrences' && {
                  '9f69a7b0-34b9-4b76-9ff7-26dc1a06ec14X0': {
                    label: 'Part of Error rate',
                    dataType: 'number',
                    operationType: 'sum',
                    sourceField: 'slo.numerator',
                    isBucketed: false,
                    scale: 'ratio',
                    params: {
                      // @ts-ignore
                      emptyAsNull: false,
                    },
                    customLabel: true,
                  },
                  '9f69a7b0-34b9-4b76-9ff7-26dc1a06ec14X1': {
                    label: 'Part of Error rate',
                    dataType: 'number',
                    operationType: 'sum',
                    sourceField: 'slo.denominator',
                    isBucketed: false,
                    scale: 'ratio',
                    params: {
                      // @ts-ignore
                      emptyAsNull: false,
                    },
                    customLabel: true,
                  },
                  '9f69a7b0-34b9-4b76-9ff7-26dc1a06ec14X2': {
                    label: 'Part of Error rate',
                    dataType: 'number',
                    operationType: 'math',
                    isBucketed: false,
                    scale: 'ratio',
                    params: {
                      // @ts-ignore
                      tinymathAst: {
                        type: 'function',
                        name: 'subtract',
                        args: [
                          1,
                          {
                            type: 'function',
                            name: 'divide',
                            args: [
                              '9f69a7b0-34b9-4b76-9ff7-26dc1a06ec14X0',
                              '9f69a7b0-34b9-4b76-9ff7-26dc1a06ec14X1',
                            ],
                            location: {
                              min: 3,
                              max: 47,
                            },
                            text: '(sum(slo.numerator) / sum(slo.denominator))',
                          },
                        ],
                        location: {
                          min: 0,
                          max: 47,
                        },
                        text: '1 - (sum(slo.numerator) / sum(slo.denominator))',
                      },
                    },
                    references: [
                      '9f69a7b0-34b9-4b76-9ff7-26dc1a06ec14X0',
                      '9f69a7b0-34b9-4b76-9ff7-26dc1a06ec14X1',
                    ],
                    customLabel: true,
                  },
                  '9f69a7b0-34b9-4b76-9ff7-26dc1a06ec14': {
                    label: 'Error rate',
                    dataType: 'number',
                    operationType: 'formula',
                    isBucketed: false,
                    scale: 'ratio',
                    params: {
                      // @ts-ignore
                      formula: '1 - (sum(slo.numerator) / sum(slo.denominator))',
                      isFormulaBroken: false,
                      format: {
                        id: 'percent',
                        params: {
                          decimals: 2,
                        },
                      },
                    },
                    references: ['9f69a7b0-34b9-4b76-9ff7-26dc1a06ec14X2'],
                    customLabel: true,
                  },
                }),
                ...(slo.budgetingMethod === 'timeslices' && {
                  '9f69a7b0-34b9-4b76-9ff7-26dc1a06ec14X0': {
                    label: 'Part of Error rate',
                    dataType: 'number',
                    operationType: 'sum',
                    sourceField: 'slo.isGoodSlice',
                    isBucketed: false,
                    scale: 'ratio',
                    params: {
                      // @ts-ignore
                      emptyAsNull: false,
                    },
                    customLabel: true,
                  },
                  '9f69a7b0-34b9-4b76-9ff7-26dc1a06ec14X1': {
                    label: 'Part of Error rate',
                    dataType: 'number',
                    operationType: 'count',
                    sourceField: 'slo.isGoodSlice',
                    isBucketed: false,
                    scale: 'ratio',
                    params: {
                      // @ts-ignore
                      emptyAsNull: false,
                    },
                    customLabel: true,
                  },
                  '9f69a7b0-34b9-4b76-9ff7-26dc1a06ec14X2': {
                    label: 'Part of Error rate',
                    dataType: 'number',
                    operationType: 'math',
                    isBucketed: false,
                    scale: 'ratio',
                    params: {
                      // @ts-ignore
                      tinymathAst: {
                        type: 'function',
                        name: 'subtract',
                        args: [
                          1,
                          {
                            type: 'function',
                            name: 'divide',
                            args: [
                              '9f69a7b0-34b9-4b76-9ff7-26dc1a06ec14X0',
                              '9f69a7b0-34b9-4b76-9ff7-26dc1a06ec14X1',
                            ],
                            location: {
                              min: 3,
                              max: 47,
                            },
                            text: '(sum(slo.isGoodSlice) / count(slo.isGoodSlice))',
                          },
                        ],
                        location: {
                          min: 0,
                          max: 47,
                        },
                        text: '1 - (sum(slo.isGoodSlice) / count(slo.isGoodSlice))',
                      },
                    },
                    references: [
                      '9f69a7b0-34b9-4b76-9ff7-26dc1a06ec14X0',
                      '9f69a7b0-34b9-4b76-9ff7-26dc1a06ec14X1',
                    ],
                    customLabel: true,
                  },
                  '9f69a7b0-34b9-4b76-9ff7-26dc1a06ec14': {
                    label: 'Error rate',
                    dataType: 'number',
                    operationType: 'formula',
                    isBucketed: false,
                    scale: 'ratio',
                    params: {
                      // @ts-ignore
                      formula: '1 - (sum(slo.isGoodSlice) / count(slo.isGoodSlice))',
                      isFormulaBroken: false,
                      format: {
                        id: 'percent',
                        params: {
                          decimals: 2,
                        },
                      },
                    },
                    references: ['9f69a7b0-34b9-4b76-9ff7-26dc1a06ec14X2'],
                    customLabel: true,
                  },
                }),
              },
              columnOrder: [
                '627ded04-eae0-4437-83a1-bbb6138d2c3b',
                '9f69a7b0-34b9-4b76-9ff7-26dc1a06ec14',
                '9f69a7b0-34b9-4b76-9ff7-26dc1a06ec14X0',
                '9f69a7b0-34b9-4b76-9ff7-26dc1a06ec14X1',
                '9f69a7b0-34b9-4b76-9ff7-26dc1a06ec14X2',
              ],
              incompleteColumns: {},
              sampling: 1,
            },
            '34298f84-681e-4fa3-8107-d6facb32ed92': {
              linkToLayers: [],
              columns: {
                '0a42b72b-cd5a-4d59-81ec-847d97c268e6X0': {
                  label: 'Part of 14.4x',
                  dataType: 'number',
                  operationType: 'math',
                  isBucketed: false,
                  scale: 'ratio',
                  params: {
                    // @ts-ignore
                    tinymathAst: {
                      type: 'function',
                      name: 'multiply',
                      args: [
                        {
                          type: 'function',
                          name: 'subtract',
                          args: [1, slo.objective.target],
                          location: {
                            min: 1,
                            max: 9,
                          },
                          text: `1 - ${slo.objective.target}`,
                        },
                        14.4,
                      ],
                      location: {
                        min: 0,
                        max: 17,
                      },
                      text: `(1 - ${slo.objective.target}) * 14.4`,
                    },
                  },
                  references: [],
                  customLabel: true,
                },
                '0a42b72b-cd5a-4d59-81ec-847d97c268e6': {
                  label: '14.4x',
                  dataType: 'number',
                  operationType: 'formula',
                  isBucketed: false,
                  scale: 'ratio',
                  params: {
                    // @ts-ignore
                    formula: `(1 - ${slo.objective.target}) * 14.4`,
                    isFormulaBroken: false,
                  },
                  references: ['0a42b72b-cd5a-4d59-81ec-847d97c268e6X0'],
                  customLabel: true,
                },
                '76d3bcc9-7d45-4b08-b2b1-8d3866ca0762X0': {
                  label: 'Part of 6x',
                  dataType: 'number',
                  operationType: 'math',
                  isBucketed: false,
                  scale: 'ratio',
                  params: {
                    // @ts-ignore
                    tinymathAst: {
                      type: 'function',
                      name: 'multiply',
                      args: [
                        {
                          type: 'function',
                          name: 'subtract',
                          args: [1, slo.objective.target],
                          location: {
                            min: 1,
                            max: 9,
                          },
                          text: `1 - ${slo.objective.target}`,
                        },
                        6,
                      ],
                      location: {
                        min: 0,
                        max: 14,
                      },
                      text: `(1 - ${slo.objective.target}) * 6`,
                    },
                  },
                  references: [],
                  customLabel: true,
                },
                '76d3bcc9-7d45-4b08-b2b1-8d3866ca0762': {
                  label: '6x',
                  dataType: 'number',
                  operationType: 'formula',
                  isBucketed: false,
                  scale: 'ratio',
                  params: {
                    // @ts-ignore
                    formula: `(1 - ${slo.objective.target}) * 6`,
                    isFormulaBroken: false,
                  },
                  references: ['76d3bcc9-7d45-4b08-b2b1-8d3866ca0762X0'],
                  customLabel: true,
                },
                'c531a6b1-70dd-4918-bdd0-a21535a7af05X0': {
                  label: 'Part of 3x',
                  dataType: 'number',
                  operationType: 'math',
                  isBucketed: false,
                  scale: 'ratio',
                  params: {
                    // @ts-ignore
                    tinymathAst: {
                      type: 'function',
                      name: 'multiply',
                      args: [
                        {
                          type: 'function',
                          name: 'subtract',
                          args: [1, slo.objective.target],
                          location: {
                            min: 1,
                            max: 9,
                          },
                          text: `1 - ${slo.objective.target}`,
                        },
                        3,
                      ],
                      location: {
                        min: 0,
                        max: 14,
                      },
                      text: `(1 - ${slo.objective.target}) * 3`,
                    },
                  },
                  references: [],
                  customLabel: true,
                },
                'c531a6b1-70dd-4918-bdd0-a21535a7af05': {
                  label: '3x',
                  dataType: 'number',
                  operationType: 'formula',
                  isBucketed: false,
                  scale: 'ratio',
                  params: {
                    // @ts-ignore
                    formula: `(1 - ${slo.objective.target}) * 3`,
                    isFormulaBroken: false,
                  },
                  references: ['c531a6b1-70dd-4918-bdd0-a21535a7af05X0'],
                  customLabel: true,
                },
                '61f9e663-10eb-41f7-b584-1f0f95418489X0': {
                  label: 'Part of 1x',
                  dataType: 'number',
                  operationType: 'math',
                  isBucketed: false,
                  scale: 'ratio',
                  params: {
                    // @ts-ignore
                    tinymathAst: {
                      type: 'function',
                      name: 'multiply',
                      args: [
                        {
                          type: 'function',
                          name: 'subtract',
                          args: [1, slo.objective.target],
                          location: {
                            min: 1,
                            max: 9,
                          },
                          text: `1 - ${slo.objective.target}`,
                        },
                        1,
                      ],
                      location: {
                        min: 0,
                        max: 14,
                      },
                      text: `(1 - ${slo.objective.target}) * 1`,
                    },
                  },
                  references: [],
                  customLabel: true,
                },
                '61f9e663-10eb-41f7-b584-1f0f95418489': {
                  label: '1x',
                  dataType: 'number',
                  operationType: 'formula',
                  isBucketed: false,
                  scale: 'ratio',
                  params: {
                    // @ts-ignore
                    formula: `(1 - ${slo.objective.target}) * 1`,
                    isFormulaBroken: false,
                  },
                  references: ['61f9e663-10eb-41f7-b584-1f0f95418489X0'],
                  customLabel: true,
                },
              },
              columnOrder: [
                '0a42b72b-cd5a-4d59-81ec-847d97c268e6',
                '0a42b72b-cd5a-4d59-81ec-847d97c268e6X0',
                '76d3bcc9-7d45-4b08-b2b1-8d3866ca0762X0',
                '76d3bcc9-7d45-4b08-b2b1-8d3866ca0762',
                'c531a6b1-70dd-4918-bdd0-a21535a7af05X0',
                'c531a6b1-70dd-4918-bdd0-a21535a7af05',
                '61f9e663-10eb-41f7-b584-1f0f95418489X0',
                '61f9e663-10eb-41f7-b584-1f0f95418489',
              ],
              sampling: 1,
              ignoreGlobalFilters: false,
              incompleteColumns: {},
            },
          },
        },
        indexpattern: {
          layers: {},
        },
        textBased: {
          layers: {},
        },
      },
      internalReferences: [
        {
          type: 'index-pattern',
          id: '32ca1ad4-81c0-4daf-b9d1-07118044bdc5',
          name: 'indexpattern-datasource-layer-8730e8af-7dac-430e-9cef-3b9989ff0866',
        },
        {
          type: 'index-pattern',
          id: '32ca1ad4-81c0-4daf-b9d1-07118044bdc5',
          name: 'indexpattern-datasource-layer-34298f84-681e-4fa3-8107-d6facb32ed92',
        },
      ],
      adHocDataViews: {
        '32ca1ad4-81c0-4daf-b9d1-07118044bdc5': {
          id: '32ca1ad4-81c0-4daf-b9d1-07118044bdc5',
          title: SLO_DESTINATION_INDEX_PATTERN,
          timeFieldName: '@timestamp',
          sourceFilters: [],
          fieldFormats: {},
          runtimeFieldMap: {},
          fieldAttrs: {},
          allowNoIndex: false,
          name: 'SLO Rollup Data',
        },
      },
    },
  };
}
