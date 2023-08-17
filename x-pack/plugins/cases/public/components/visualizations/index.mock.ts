/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const lensVisualization = {
  timeRange: { from: 'now-7d', to: 'now', mode: 'relative' },
  attributes: {
    title: '',
    description: '',
    visualizationType: 'lnsXY',
    type: 'lens',
    references: [
      {
        type: 'index-pattern',
        id: 'security-solution-default',
        name: 'indexpattern-datasource-layer-f7de35b1-ea37-483f-a642-dc261dd3e965',
      },
    ],
    state: {
      visualization: {
        legend: { isVisible: true, position: 'right' },
        valueLabels: 'hide',
        fittingFunction: 'None',
        axisTitlesVisibilitySettings: { x: true, yLeft: true, yRight: true },
        tickLabelsVisibilitySettings: { x: true, yLeft: true, yRight: true },
        labelsOrientation: { x: 0, yLeft: 0, yRight: 0 },
        gridlinesVisibilitySettings: { x: true, yLeft: true, yRight: true },
        preferredSeriesType: 'bar_stacked',
        layers: [
          {
            layerId: 'f7de35b1-ea37-483f-a642-dc261dd3e965',
            accessors: ['7362bd0f-d602-4cbb-8246-37e41b38eeeb'],
            position: 'top',
            seriesType: 'bar_stacked',
            showGridlines: false,
            layerType: 'data',
            xAccessor: 'dea21c97-cc99-432a-ae0b-fce79f23830d',
          },
        ],
      },
      query: { query: '', language: 'kuery' },
      filters: [],
      datasourceStates: {
        formBased: {
          layers: {
            'f7de35b1-ea37-483f-a642-dc261dd3e965': {
              columns: {
                'dea21c97-cc99-432a-ae0b-fce79f23830d': {
                  label: 'Top 5 values of host.name',
                  dataType: 'string',
                  operationType: 'terms',
                  scale: 'ordinal',
                  sourceField: 'host.name',
                  isBucketed: true,
                  params: {
                    size: 5,
                    orderBy: { type: 'column', columnId: '7362bd0f-d602-4cbb-8246-37e41b38eeeb' },
                    orderDirection: 'desc',
                    otherBucket: true,
                    missingBucket: false,
                    parentFormat: { id: 'terms' },
                    include: [],
                    exclude: [],
                    includeIsRegex: false,
                    excludeIsRegex: false,
                  },
                },
                '7362bd0f-d602-4cbb-8246-37e41b38eeeb': {
                  label: 'Count of records',
                  dataType: 'number',
                  operationType: 'count',
                  isBucketed: false,
                  scale: 'ratio',
                  sourceField: '___records___',
                  params: { emptyAsNull: true },
                },
              },
              columnOrder: [
                'dea21c97-cc99-432a-ae0b-fce79f23830d',
                '7362bd0f-d602-4cbb-8246-37e41b38eeeb',
              ],
              incompleteColumns: {},
              sampling: 1,
            },
          },
        },
        textBased: { layers: {} },
      },
      internalReferences: [],
      adHocDataViews: {},
    },
  },
};
