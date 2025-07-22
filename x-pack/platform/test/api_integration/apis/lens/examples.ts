/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getExampleLensBody = (title = `Lens vis - ${Date.now()} - ${Math.random()}`) => ({
  data: {
    title,
    description: '',
    visualizationType: 'lnsMetric',
    state: {
      visualization: {
        layerId: '32e889c6-89f9-4873-b1f7-d5bea381c582',
        layerType: 'data',
        metricAccessor: '1c6729bc-ec92-4000-8dcc-0fdd7b56d5b8',
        secondaryTrend: {
          type: 'none',
        },
      },
      query: {
        query: '',
        language: 'kuery',
      },
      filters: [],
      datasourceStates: {
        formBased: {
          layers: {
            '32e889c6-89f9-4873-b1f7-d5bea381c582': {
              columns: {
                '1c6729bc-ec92-4000-8dcc-0fdd7b56d5b8': {
                  label: 'Count of records',
                  dataType: 'number',
                  operationType: 'count',
                  isBucketed: false,
                  scale: 'ratio',
                  sourceField: '___records___',
                  params: {
                    emptyAsNull: true,
                  },
                },
              },
              columnOrder: ['1c6729bc-ec92-4000-8dcc-0fdd7b56d5b8'],
              incompleteColumns: {
                'd0b92889-f74c-4194-b738-76eb5d268524': {
                  operationType: 'date_histogram',
                },
              },
              sampling: 1,
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
      internalReferences: [],
      adHocDataViews: {},
    },
  },
  options: {
    references: [
      {
        type: 'index-pattern',
        id: '91200a00-9efd-11e7-acb3-3dab96693fab',
        name: 'indexpattern-datasource-layer-32e889c6-89f9-4873-b1f7-d5bea381c582',
      },
    ],
  },
});
