/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const kpiUniqueFlowIds = {
  title: '[Network] KPI Unique flow IDs',
  description: '',
  visualizationType: 'lnsMetric',
  state: {
    visualization: {
      layerId: '5d46d48f-6ce8-46be-a797-17ad50642564',
      accessor: 'a27f3503-9c73-4fc1-86bb-12461dae4b70',
      layerType: 'data',
    },
    query: {
      query: 'source.ip: * or destination.ip: * ',
      language: 'kuery',
    },
    filters: [],
    datasourceStates: {
      indexpattern: {
        layers: {
          '5d46d48f-6ce8-46be-a797-17ad50642564': {
            columns: {
              'a27f3503-9c73-4fc1-86bb-12461dae4b70': {
                label: ' ',
                dataType: 'number',
                operationType: 'unique_count',
                scale: 'ratio',
                sourceField: 'network.community_id',
                isBucketed: false,
                customLabel: true,
              },
            },
            columnOrder: ['a27f3503-9c73-4fc1-86bb-12461dae4b70'],
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
      name: 'indexpattern-datasource-layer-5d46d48f-6ce8-46be-a797-17ad50642564',
    },
  ],
};
