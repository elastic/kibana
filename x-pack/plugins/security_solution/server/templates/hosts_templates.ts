/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const hostsTemplates = [
  {
    id: '6853a880-5451-99ec-b0fd-2f7a10a18ba6',
    title: '[Security Solution] KPI Hosts',
    description: '',
    visualizationType: 'lnsXY',
    state: {
      visualization: {
        legend: {
          isVisible: false,
          position: 'right',
        },
        valueLabels: 'hide',
        fittingFunction: 'None',
        yLeftExtent: {
          mode: 'full',
        },
        yRightExtent: {
          mode: 'full',
        },
        axisTitlesVisibilitySettings: {
          x: false,
          yLeft: false,
          yRight: false,
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
            layerId: 'f6172bed-07e8-48fc-b9e4-2291fe061aed',
            accessors: ['6e680915-0114-489c-9d5b-2149eb4ab6a7'],
            position: 'top',
            seriesType: 'area',
            showGridlines: false,
            layerType: 'data',
            xAccessor: 'e79c098a-a6c3-45c5-9608-21a7f76e6d5d',
          },
        ],
      },
      query: {
        query: '',
        language: 'kuery',
      },
      filters: [],
      datasourceStates: {
        indexpattern: {
          layers: {
            'f6172bed-07e8-48fc-b9e4-2291fe061aed': {
              columns: {
                'e79c098a-a6c3-45c5-9608-21a7f76e6d5d': {
                  label: '@timestamp',
                  dataType: 'date',
                  operationType: 'date_histogram',
                  sourceField: '@timestamp',
                  isBucketed: true,
                  scale: 'interval',
                  params: {
                    interval: 'auto',
                  },
                },
                '6e680915-0114-489c-9d5b-2149eb4ab6a7': {
                  label: 'Unique count of host.name',
                  dataType: 'number',
                  operationType: 'unique_count',
                  scale: 'ratio',
                  sourceField: 'host.name',
                  isBucketed: false,
                },
              },
              columnOrder: [
                'e79c098a-a6c3-45c5-9608-21a7f76e6d5d',
                '6e680915-0114-489c-9d5b-2149eb4ab6a7',
              ],
              incompleteColumns: {},
            },
          },
        },
      },
    },
    references: [
      {
        type: 'index-pattern',
        id: 'security-solution-default',
        name: 'indexpattern-datasource-current-indexpattern',
      },
      {
        type: 'index-pattern',
        id: 'security-solution-default',
        name: 'indexpattern-datasource-layer-f6172bed-07e8-48fc-b9e4-2291fe061aed',
      },
      {
        type: 'tag',
        id: '6853a880-5451-11ec-b0fd-2f7a10a18ba6',
        name: 'tag-ref-6853a880-5451-11ec-b0fd-2f7a10a18ba6',
      },
      {
        type: 'tag',
        id: '9853a880-5455-11ec-b0fd-2f7a10a18ba6',
        name: 'tag-ref-9853a880-5455-11ec-b0fd-2f7a10a18ba6',
      },
    ],
  },
  {
    id: 'c11c7d50-58fe-11ec-96dc-d93a3ad74de7',
    description: '',
    state: {
      datasourceStates: {
        indexpattern: {
          layers: {
            layer0: {
              columnOrder: ['x-axis-column-layer0', 'y-axis-column-layer0'],
              columns: {
                'x-axis-column-layer0': {
                  dataType: 'string',
                  isBucketed: true,
                  label: 'Filters',
                  operationType: 'filters',
                  params: {
                    filters: [
                      {
                        input: {
                          language: 'kuery',
                          query: 'event.outcome: success',
                        },
                        label: 'Succ',
                      },
                    ],
                  },
                  scale: 'ordinal',
                },
                'y-axis-column-layer0': {
                  dataType: 'number',
                  filter: {
                    language: 'kuery',
                    query: '@timestamp >= now-1h and @timestamp <= now and event.outcome: success',
                  },
                  isBucketed: false,
                  label: 'authenticationsSuccess',
                  operationType: 'count',
                  scale: 'ratio',
                  sourceField: 'Records',
                },
              },
              incompleteColumns: {},
            },
            layer1: {
              columnOrder: ['x-axis-column-layer1', 'y-axis-column-layer1'],
              columns: {
                'x-axis-column-layer1': {
                  dataType: 'string',
                  isBucketed: true,
                  label: 'Filters',
                  operationType: 'filters',
                  params: {
                    filters: [
                      {
                        input: {
                          language: 'kuery',
                          query: 'event.outcome: failure',
                        },
                        label: 'Fail',
                      },
                    ],
                  },
                  scale: 'ordinal',
                },
                'y-axis-column-layer1': {
                  dataType: 'number',
                  filter: {
                    language: 'kuery',
                    query: '@timestamp >= now-1h and @timestamp <= now and event.outcome: failure',
                  },
                  isBucketed: false,
                  label: 'authenticationsFailure',
                  operationType: 'count',
                  scale: 'ratio',
                  sourceField: 'Records',
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
          '(event.outcome: "success" or event.outcome : "failure") and event.category: "authentication"',
      },
      visualization: {
        axisTitlesVisibilitySettings: {
          x: false,
          yLeft: false,
          yRight: false,
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
            seriesType: 'bar_horizontal_stacked',
            xAccessor: 'x-axis-column-layer0',
            yConfig: [
              {
                color: '#209280',
                forAccessor: 'y-axis-column',
              },
              {
                color: '#cc5642',
                forAccessor: 'y-axis-column-1',
              },
            ],
          },
          {
            accessors: ['y-axis-column-layer1'],
            layerId: 'layer1',
            layerType: 'data',
            seriesType: 'bar_horizontal_stacked',
            xAccessor: 'x-axis-column-layer1',
            yConfig: [
              {
                color: '#209280',
                forAccessor: 'y-axis-column',
              },
              {
                color: '#cc5642',
                forAccessor: 'y-axis-column-1',
              },
            ],
          },
        ],
        legend: {
          isVisible: false,
          position: 'right',
          showSingleSeries: true,
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
    title: '[Security Solution] Authentication',
    visualizationType: 'lnsXY',
    references: [
      {
        id: 'security-solution-default',
        name: 'indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: 'security-solution-default',
        name: 'indexpattern-datasource-layer-layer0',
        type: 'index-pattern',
      },
      {
        id: 'security-solution-default',
        name: 'indexpattern-datasource-layer-layer1',
        type: 'index-pattern',
      },
      {
        type: 'tag',
        id: '6853a880-5451-11ec-b0fd-2f7a10a18ba6',
        name: 'tag-ref-6853a880-5451-11ec-b0fd-2f7a10a18ba6',
      },
      {
        type: 'tag',
        id: '9853a880-5455-11ec-b0fd-2f7a10a18ba6',
        name: 'tag-ref-9853a880-5455-11ec-b0fd-2f7a10a18ba6',
      },
    ],
  },
  {
    id: '1638d1d0-58ff-11ec-96dc-d93a3ad74de7',
    description: '',
    state: {
      datasourceStates: {
        indexpattern: {
          layers: {
            layer0: {
              columnOrder: ['x-axis-column-layer0', 'y-axis-column-layer0'],
              columns: {
                'x-axis-column-layer0': {
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
                'y-axis-column-layer0': {
                  dataType: 'number',
                  filter: {
                    language: 'kuery',
                    query: 'event.outcome: success and event.category: "authentication"',
                  },
                  isBucketed: false,
                  label: 'User authentication success',
                  operationType: 'count',
                  scale: 'ratio',
                  sourceField: 'Records',
                },
              },
              incompleteColumns: {},
            },
            layer1: {
              columnOrder: ['x-axis-column-layer1', 'y-axis-column-layer1'],
              columns: {
                'x-axis-column-layer1': {
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
                'y-axis-column-layer1': {
                  dataType: 'number',
                  filter: {
                    language: 'kuery',
                    query: 'event.outcome: failure and event.category: "authentication"',
                  },
                  isBucketed: false,
                  label: 'User authentication failure',
                  operationType: 'count',
                  scale: 'ratio',
                  sourceField: 'Records',
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
        query: '',
      },
      visualization: {
        axisTitlesVisibilitySettings: {
          x: false,
          yLeft: false,
          yRight: false,
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
            palette: {
              name: 'status',
              type: 'palette',
            },
            seriesType: 'area',
            xAccessor: 'x-axis-column-layer0',
            yConfig: [
              {
                axisMode: 'left',
                color: '#54b399',
                forAccessor: 'y-axis-column-layer0',
              },
            ],
          },
          {
            accessors: ['y-axis-column-layer1'],
            layerId: 'layer1',
            layerType: 'data',
            palette: {
              name: 'status',
              type: 'palette',
            },
            seriesType: 'area',
            xAccessor: 'x-axis-column-layer1',
            yConfig: [
              {
                axisMode: 'left',
                color: '#6092c0',
                forAccessor: 'y-axis-column-layer1',
              },
            ],
          },
        ],
        legend: {
          isVisible: false,
          position: 'right',
          showSingleSeries: true,
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
    title: '[Security Solution] Authentication - area chart',
    visualizationType: 'lnsXY',
    references: [
      {
        id: 'security-solution-default',
        name: 'indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: 'security-solution-default',
        name: 'indexpattern-datasource-layer-layer0',
        type: 'index-pattern',
      },
      {
        id: 'security-solution-default',
        name: 'indexpattern-datasource-layer-layer1',
        type: 'index-pattern',
      },
      {
        type: 'tag',
        id: '6853a880-5451-11ec-b0fd-2f7a10a18ba6',
        name: 'tag-ref-6853a880-5451-11ec-b0fd-2f7a10a18ba6',
      },
      {
        type: 'tag',
        id: '9853a880-5455-11ec-b0fd-2f7a10a18ba6',
        name: 'tag-ref-9853a880-5455-11ec-b0fd-2f7a10a18ba6',
      },
    ],
  },
  {
    id: '5a1b8db0-5900-11ec-96dc-d93a3ad74de7',
    description: '',
    state: {
      datasourceStates: {
        indexpattern: {
          layers: {
            layer0: {
              columnOrder: ['x-axis-column-layer0', 'y-axis-column-layer0'],
              columns: {
                'x-axis-column-layer0': {
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
                'y-axis-column-layer0': {
                  dataType: 'number',
                  filter: {
                    language: 'kuery',
                    query: '',
                  },
                  isBucketed: false,
                  label: 'Unique_count of source ip',
                  operationType: 'unique_count',
                  scale: 'ratio',
                  sourceField: 'source.ip',
                },
              },
              incompleteColumns: {},
            },
            layer1: {
              columnOrder: ['x-axis-column-layer1', 'y-axis-column-layer1'],
              columns: {
                'x-axis-column-layer1': {
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
                'y-axis-column-layer1': {
                  dataType: 'number',
                  filter: {
                    language: 'kuery',
                    query: '',
                  },
                  isBucketed: false,
                  label: 'Unique_count of destination ip',
                  operationType: 'unique_count',
                  scale: 'ratio',
                  sourceField: 'destination.ip',
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
        query: '',
      },
      visualization: {
        axisTitlesVisibilitySettings: {
          x: false,
          yLeft: false,
          yRight: false,
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
            palette: {
              name: 'status',
              type: 'palette',
            },
            seriesType: 'area',
            xAccessor: 'x-axis-column-layer0',
            yConfig: [
              {
                axisMode: 'left',
                color: '#54b399',
                forAccessor: 'y-axis-column-layer0',
              },
            ],
          },
          {
            accessors: ['y-axis-column-layer1'],
            layerId: 'layer1',
            layerType: 'data',
            palette: {
              name: 'status',
              type: 'palette',
            },
            seriesType: 'area',
            xAccessor: 'x-axis-column-layer1',
            yConfig: [
              {
                axisMode: 'left',
                color: '#6092c0',
                forAccessor: 'y-axis-column-layer1',
              },
            ],
          },
        ],
        legend: {
          isVisible: false,
          position: 'right',
          showSingleSeries: true,
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
    title: '[Security Solution] Unique IPs - area chart',
    visualizationType: 'lnsXY',
    references: [
      {
        id: 'security-solution-default',
        name: 'indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: 'security-solution-default',
        name: 'indexpattern-datasource-layer-layer0',
        type: 'index-pattern',
      },
      {
        id: 'security-solution-default',
        name: 'indexpattern-datasource-layer-layer1',
        type: 'index-pattern',
      },
      {
        type: 'tag',
        id: '6853a880-5451-11ec-b0fd-2f7a10a18ba6',
        name: 'tag-ref-6853a880-5451-11ec-b0fd-2f7a10a18ba6',
      },
      {
        type: 'tag',
        id: '9853a880-5455-11ec-b0fd-2f7a10a18ba6',
        name: 'tag-ref-9853a880-5455-11ec-b0fd-2f7a10a18ba6',
      },
    ],
  },
  {
    id: 'e7df0650-590e-11ec-941e-31737924fa52',
    title: '[Security Solution] Unique IPs',
    description: '',
    visualizationType: 'lnsXY',
    state: {
      visualization: {
        legend: {
          isVisible: false,
          position: 'right',
        },
        valueLabels: 'hide',
        fittingFunction: 'None',
        yLeftExtent: {
          mode: 'full',
        },
        yRightExtent: {
          mode: 'full',
        },
        axisTitlesVisibilitySettings: {
          x: false,
          yLeft: false,
          yRight: false,
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
        preferredSeriesType: 'bar_horizontal_stacked',
        layers: [
          {
            layerId: '4141917b-8c32-4864-9d43-82cb1da73134',
            accessors: ['9ad00e27-874d-49eb-b22c-3343ba364584'],
            position: 'top',
            seriesType: 'bar_horizontal_stacked',
            showGridlines: false,
            layerType: 'data',
            xAccessor: '2cf81268-9c1a-417e-98b5-ccc8cb60cfc6',
          },
          {
            layerId: '4b3f318b-85e3-497d-a233-219e3d42da89',
            seriesType: 'bar_horizontal_stacked',
            accessors: ['49c39e98-6cb8-4320-986b-3f6a9fbaefc0'],
            layerType: 'data',
            xAccessor: 'a729ad70-c72e-4372-ae75-a842388f1738',
          },
        ],
      },
      query: {
        query: '',
        language: 'kuery',
      },
      filters: [],
      datasourceStates: {
        indexpattern: {
          layers: {
            '4141917b-8c32-4864-9d43-82cb1da73134': {
              columns: {
                '2cf81268-9c1a-417e-98b5-ccc8cb60cfc6': {
                  label: 'Src.',
                  dataType: 'string',
                  operationType: 'filters',
                  scale: 'ordinal',
                  isBucketed: true,
                  params: {
                    filters: [
                      {
                        label: 'Src.',
                        input: {
                          query: '',
                          language: 'kuery',
                        },
                      },
                    ],
                  },
                  customLabel: true,
                },
                '9ad00e27-874d-49eb-b22c-3343ba364584': {
                  label: 'Unique count of source.ip',
                  dataType: 'number',
                  operationType: 'unique_count',
                  scale: 'ratio',
                  sourceField: 'source.ip',
                  isBucketed: false,
                  customLabel: false,
                },
              },
              columnOrder: [
                '2cf81268-9c1a-417e-98b5-ccc8cb60cfc6',
                '9ad00e27-874d-49eb-b22c-3343ba364584',
              ],
              incompleteColumns: {},
            },
            '4b3f318b-85e3-497d-a233-219e3d42da89': {
              columns: {
                'a729ad70-c72e-4372-ae75-a842388f1738': {
                  label: 'Dest.',
                  dataType: 'string',
                  operationType: 'filters',
                  scale: 'ordinal',
                  isBucketed: true,
                  params: {
                    filters: [
                      {
                        input: {
                          query: '',
                          language: 'kuery',
                        },
                        label: 'Dest.',
                      },
                    ],
                  },
                  customLabel: true,
                },
                '49c39e98-6cb8-4320-986b-3f6a9fbaefc0': {
                  label: 'Unique count of destination.ip',
                  dataType: 'number',
                  operationType: 'unique_count',
                  scale: 'ratio',
                  sourceField: 'destination.ip',
                  isBucketed: false,
                },
              },
              columnOrder: [
                'a729ad70-c72e-4372-ae75-a842388f1738',
                '49c39e98-6cb8-4320-986b-3f6a9fbaefc0',
              ],
              incompleteColumns: {},
            },
          },
        },
      },
    },
    references: [
      {
        type: 'index-pattern',
        id: 'security-solution-default',
        name: 'indexpattern-datasource-current-indexpattern',
      },
      {
        type: 'index-pattern',
        id: 'security-solution-default',
        name: 'indexpattern-datasource-layer-4141917b-8c32-4864-9d43-82cb1da73134',
      },
      {
        type: 'index-pattern',
        id: 'security-solution-default',
        name: 'indexpattern-datasource-layer-4b3f318b-85e3-497d-a233-219e3d42da89',
      },
      {
        type: 'tag',
        id: '6853a880-5451-11ec-b0fd-2f7a10a18ba6',
        name: 'tag-ref-6853a880-5451-11ec-b0fd-2f7a10a18ba6',
      },
      {
        type: 'tag',
        id: '9853a880-5455-11ec-b0fd-2f7a10a18ba6',
        name: 'tag-ref-9853a880-5455-11ec-b0fd-2f7a10a18ba6',
      },
    ],
  },
  {
    id: '0f7a1600-5914-11ec-bf90-5d5516a895d1',
    title: '[Security Solution] Authentication Success Matrix',
    description: '',
    visualizationType: 'lnsMetric',
    state: {
      visualization: {
        layerId: '717e94c1-74b7-4aef-9260-619162fdc680',
        accessor: '5f311d67-44be-4ff6-a182-a6cebd14e965',
        layerType: 'data',
      },
      query: {
        query: 'event.outcome: "success" and event.category: "authentication"',
        language: 'kuery',
      },
      filters: [],
      datasourceStates: {
        indexpattern: {
          layers: {
            '717e94c1-74b7-4aef-9260-619162fdc680': {
              columns: {
                '5f311d67-44be-4ff6-a182-a6cebd14e965': {
                  label: 'Count of records',
                  dataType: 'number',
                  operationType: 'count',
                  isBucketed: false,
                  scale: 'ratio',
                  sourceField: 'Records',
                  filter: {
                    query: 'event.outcome: success',
                    language: 'kuery',
                  },
                },
              },
              columnOrder: ['5f311d67-44be-4ff6-a182-a6cebd14e965'],
              incompleteColumns: {},
            },
          },
        },
      },
    },
    references: [
      {
        type: 'index-pattern',
        id: 'security-solution-default',
        name: 'indexpattern-datasource-current-indexpattern',
      },
      {
        type: 'index-pattern',
        id: 'security-solution-default',
        name: 'indexpattern-datasource-layer-717e94c1-74b7-4aef-9260-619162fdc680',
      },
      {
        type: 'tag',
        id: '6853a880-5451-11ec-b0fd-2f7a10a18ba6',
        name: 'tag-ref-6853a880-5451-11ec-b0fd-2f7a10a18ba6',
      },
      {
        type: 'tag',
        id: '9853a880-5455-11ec-b0fd-2f7a10a18ba6',
        name: 'tag-ref-9853a880-5455-11ec-b0fd-2f7a10a18ba6',
      },
    ],
  },
  {
    id: '1dee57a0-5914-11ec-bf90-5d5516a895d1',
    title: '[Security Solution] Authentication Failure Matrix',
    description: '',
    visualizationType: 'lnsMetric',
    state: {
      visualization: {
        layerId: '717e94c1-74b7-4aef-9260-619162fdc680',
        accessor: '5f311d67-44be-4ff6-a182-a6cebd14e965',
        layerType: 'data',
      },
      query: {
        query: 'event.outcome: "failure" and event.category: "authentication"',
        language: 'kuery',
      },
      filters: [],
      datasourceStates: {
        indexpattern: {
          layers: {
            '717e94c1-74b7-4aef-9260-619162fdc680': {
              columns: {
                '5f311d67-44be-4ff6-a182-a6cebd14e965': {
                  label: 'Count of records',
                  dataType: 'number',
                  operationType: 'count',
                  isBucketed: false,
                  scale: 'ratio',
                  sourceField: 'Records',
                  filter: {
                    query: 'event.outcome: success',
                    language: 'kuery',
                  },
                },
              },
              columnOrder: ['5f311d67-44be-4ff6-a182-a6cebd14e965'],
              incompleteColumns: {},
            },
          },
        },
      },
    },
    references: [
      {
        type: 'index-pattern',
        id: 'security-solution-default',
        name: 'indexpattern-datasource-current-indexpattern',
      },
      {
        type: 'index-pattern',
        id: 'security-solution-default',
        name: 'indexpattern-datasource-layer-717e94c1-74b7-4aef-9260-619162fdc680',
      },
      {
        type: 'tag',
        id: '6853a880-5451-11ec-b0fd-2f7a10a18ba6',
        name: 'tag-ref-6853a880-5451-11ec-b0fd-2f7a10a18ba6',
      },
      {
        type: 'tag',
        id: '9853a880-5455-11ec-b0fd-2f7a10a18ba6',
        name: 'tag-ref-9853a880-5455-11ec-b0fd-2f7a10a18ba6',
      },
    ],
  },
];
