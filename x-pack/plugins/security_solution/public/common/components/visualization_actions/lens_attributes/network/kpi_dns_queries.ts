/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LensAttributes } from '../../types';

export const kpiDnsQueriesLensAttributes: LensAttributes = {
  title: '[Network] DNS metric',
  description: '',
  visualizationType: 'lnsMetric',
  state: {
    visualization: {
      layerId: 'cea37c70-8f91-43bf-b9fe-72d8c049f6a3',
      accessor: '0374e520-eae0-4ac1-bcfe-37565e7fc9e3',
      layerType: 'data',
      colorMode: 'None',
    },
    query: {
      query: '',
      language: 'kuery',
    },
    filters: [
      {
        meta: {
          index: '196d783b-3779-4c39-898e-6606fe633d05',
          type: 'custom',
          disabled: false,
          negate: false,
          alias: null,
          key: 'query',
          value:
            '{"bool":{"should":[{"exists":{"field":"dns.question.name"}},{"term":{"suricata.eve.dns.type":{"value":"query"}}},{"exists":{"field":"zeek.dns.query"}}],"minimum_should_match":1}}',
        },
        $state: {
          store: 'appState',
        },
        query: {
          bool: {
            should: [
              {
                exists: {
                  field: 'dns.question.name',
                },
              },
              {
                term: {
                  'suricata.eve.dns.type': {
                    value: 'query',
                  },
                },
              },
              {
                exists: {
                  field: 'zeek.dns.query',
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
          'cea37c70-8f91-43bf-b9fe-72d8c049f6a3': {
            columns: {
              '0374e520-eae0-4ac1-bcfe-37565e7fc9e3': {
                label: '',
                dataType: 'number',
                operationType: 'count',
                isBucketed: false,
                scale: 'ratio',
                sourceField: '___records___',
                customLabel: true,
              },
            },
            columnOrder: ['0374e520-eae0-4ac1-bcfe-37565e7fc9e3'],
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
      name: 'indexpattern-datasource-layer-cea37c70-8f91-43bf-b9fe-72d8c049f6a3',
    },
    {
      type: 'index-pattern',
      name: '196d783b-3779-4c39-898e-6606fe633d05',
      id: '{dataViewId}',
    },
  ],
} as LensAttributes;
