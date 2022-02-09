/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const kpiDnsQueries = {
  title: '[Network] KPI Unique private IPs - source metric',
  description: '',
  visualizationType: 'lnsMetric',
  state: {
    visualization: {
      layerId: 'cea37c70-8f91-43bf-b9fe-72d8c049f6a3',
      accessor: 'bd17c23e-4f83-4108-8005-2669170d064b',
      layerType: 'data',
    },
    query: {
      query:
        'source.ip: "10.0.0.0/8" or source.ip: "192.168.0.0/16" or source.ip: "172.16.0.0/12" or source.ip: "fd00::/8"',
      language: 'kuery',
    },
    filters: [],
    datasourceStates: {
      indexpattern: {
        layers: {
          'cea37c70-8f91-43bf-b9fe-72d8c049f6a3': {
            columns: {
              'bd17c23e-4f83-4108-8005-2669170d064b': {
                label: ' ',
                dataType: 'number',
                operationType: 'unique_count',
                scale: 'ratio',
                sourceField: 'source.ip',
                isBucketed: false,
                customLabel: true,
              },
            },
            columnOrder: ['bd17c23e-4f83-4108-8005-2669170d064b'],
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
      name: 'indexpattern-datasource-layer-cea37c70-8f91-43bf-b9fe-72d8c049f6a3',
    },
  ],
};
