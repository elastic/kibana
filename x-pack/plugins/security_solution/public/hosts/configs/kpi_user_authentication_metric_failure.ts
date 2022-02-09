/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export const kpiUserAuthenticationsMetricFailure = {
  title: '[Host] KPI User authentications - metric failure ',
  description: '',
  visualizationType: 'lnsMetric',
  state: {
    visualization: {
      accessor: '0eb97c09-a351-4280-97da-944e4bd30dd7',
      layerId: '4590dafb-4ac7-45aa-8641-47a3ff0b817c',
      layerType: 'data',
    },
    query: {
      language: 'kuery',
      query: '',
    },
    filters: [
      {
        $state: {
          store: 'appState',
        },
        meta: {
          alias: null,
          disabled: false,
          indexRefName: 'filter-index-pattern-0',
          key: 'query',
          negate: false,
          type: 'custom',
          value: '{"bool":{"filter":[{"term":{"event.category":"authentication"}}]}}',
        },
        query: {
          bool: {
            filter: [
              {
                term: {
                  'event.category': 'authentication',
                },
              },
            ],
          },
        },
      },
    ],
    datasourceStates: {
      indexpattern: {
        layers: {
          '4590dafb-4ac7-45aa-8641-47a3ff0b817c': {
            columnOrder: ['0eb97c09-a351-4280-97da-944e4bd30dd7'],
            columns: {
              '0eb97c09-a351-4280-97da-944e4bd30dd7': {
                dataType: 'number',
                filter: {
                  language: 'kuery',
                  query: 'event.outcome : "failure" ',
                },
                isBucketed: false,
                label: 'Records',
                operationType: 'count',
                scale: 'ratio',
                sourceField: '___records___',
              },
            },
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
      name: 'indexpattern-datasource-layer-4590dafb-4ac7-45aa-8641-47a3ff0b817c',
    },
    {
      type: 'tag',
      id: 'security-solution-default',
      name: 'tag-ref-security-solution-default',
    },
  ],
};
