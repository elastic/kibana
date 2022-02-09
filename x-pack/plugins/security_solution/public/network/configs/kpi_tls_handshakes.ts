/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const kpiTlsHandshakes = {
  title: '[Network] KPI TLS handshakes',
  description: '',
  visualizationType: 'lnsMetric',
  state: {
    visualization: {
      layerId: '1f48a633-8eee-45ae-9471-861227e9ca03',
      accessor: '21052b6b-5504-4084-a2e2-c17f772345cf',
      layerType: 'data',
    },
    query: {
      query:
        '(source.ip: * or destination.ip: *) and (tls.version: * or suricata.eve.tls.version: * or zeek.ssl.version: * )',
      language: 'kuery',
    },
    filters: [],
    datasourceStates: {
      indexpattern: {
        layers: {
          '1f48a633-8eee-45ae-9471-861227e9ca03': {
            columns: {
              '21052b6b-5504-4084-a2e2-c17f772345cf': {
                label: ' ',
                dataType: 'number',
                operationType: 'count',
                isBucketed: false,
                scale: 'ratio',
                sourceField: '___records___',
                customLabel: true,
              },
            },
            columnOrder: ['21052b6b-5504-4084-a2e2-c17f772345cf'],
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
      name: 'indexpattern-datasource-layer-1f48a633-8eee-45ae-9471-861227e9ca03',
    },
  ],
};
