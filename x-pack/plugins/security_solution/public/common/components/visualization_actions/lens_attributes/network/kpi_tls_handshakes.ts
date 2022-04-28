/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { LensAttributes } from '../../types';

export const kpiTlsHandshakesLensAttributes: LensAttributes = {
  title: '[Network] TLS handshakes',
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
    filters: [
      {
        meta: {
          index: '32ee22d9-2e77-4aee-8073-87750e92c3ee',
          type: 'custom',
          disabled: false,
          negate: false,
          alias: null,
          key: 'query',
          value:
            '{"bool":{"should":[{"exists":{"field":"source.ip"}},{"exists":{"field":"destination.ip"}}],"minimum_should_match":1}}',
        },
        $state: {
          store: 'appState',
        },
        query: {
          bool: {
            should: [
              {
                exists: {
                  field: 'source.ip',
                },
              },
              {
                exists: {
                  field: 'destination.ip',
                },
              },
            ],
            minimum_should_match: 1,
          },
        },
      },
      {
        meta: {
          index: '1e93f984-9374-4755-a198-de57751533c6',
          type: 'custom',
          disabled: false,
          negate: false,
          alias: null,
          key: 'query',
          value:
            '{"bool":{"should":[{"exists":{"field":"tls.version"}},{"exists":{"field":"suricata.eve.tls.version"}},{"exists":{"field":"zeek.ssl.version"}}],"minimum_should_match":1}}',
        },
        $state: {
          store: 'appState',
        },
        query: {
          bool: {
            should: [
              {
                exists: {
                  field: 'tls.version',
                },
              },
              {
                exists: {
                  field: 'suricata.eve.tls.version',
                },
              },
              {
                exists: {
                  field: 'zeek.ssl.version',
                },
              },
            ],
            minimum_should_match: 1,
          },
        },
      },
    ],
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
      id: '{dataViewId}',
      name: 'indexpattern-datasource-current-indexpattern',
    },
    {
      type: 'index-pattern',
      id: '{dataViewId}',
      name: 'indexpattern-datasource-layer-1f48a633-8eee-45ae-9471-861227e9ca03',
    },
  ],
} as LensAttributes;
