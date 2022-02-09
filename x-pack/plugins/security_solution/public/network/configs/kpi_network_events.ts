/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export const kpiNetworkEvents = {
  title: '[Network] KPI Network events',
  description: '',
  visualizationType: 'lnsMetric',
  state: {
    visualization: {
      layerId: 'eaadfec7-deaa-4aeb-a403-3b4e516416d2',
      accessor: '370ebd07-5ce0-4f46-a847-0e363c50d037',
      layerType: 'data',
    },
    query: {
      query: '',
      language: 'kuery',
    },
    filters: [
      {
        meta: {
          index: 'security-solution-default',
          alias: null,
          negate: false,
          disabled: false,
          type: 'exists',
          key: 'source.ip',
          value: 'exists',
        },
        query: {
          exists: {
            field: 'source.ip',
          },
        },
        $state: {
          store: 'appState',
        },
      },
      {
        meta: {
          index: 'security-solution-default',
          alias: null,
          negate: false,
          disabled: false,
          type: 'exists',
          key: 'destination.ip',
          value: 'exists',
        },
        query: {
          exists: {
            field: 'destination.ip',
          },
        },
        $state: {
          store: 'appState',
        },
      },
    ],
    datasourceStates: {
      indexpattern: {
        layers: {
          'eaadfec7-deaa-4aeb-a403-3b4e516416d2': {
            columns: {
              '370ebd07-5ce0-4f46-a847-0e363c50d037': {
                label: ' ',
                dataType: 'number',
                operationType: 'count',
                isBucketed: false,
                scale: 'ratio',
                sourceField: '___records___',
                customLabel: true,
              },
            },
            columnOrder: ['370ebd07-5ce0-4f46-a847-0e363c50d037'],
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
      name: 'indexpattern-datasource-layer-eaadfec7-deaa-4aeb-a403-3b4e516416d2',
    },
    {
      type: 'index-pattern',
      name: '861af17d-be25-45a3-a82d-d6e697b76e51',
      id: 'security-solution-default',
    },
    {
      type: 'index-pattern',
      name: '09617767-f732-410e-af53-bebcbd0bf4b9',
      id: 'security-solution-default',
    },
  ],
};
