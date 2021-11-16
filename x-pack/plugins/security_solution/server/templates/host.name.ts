/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const hostName = {
  id: 'e25f6260-42f7-11ec-a42d-e31ddad596f0',
  type: 'security-solution-visualisation-template',
  namespaces: ['default'],
  updated_at: '2021-11-11T14:01:36.394Z',
  version: 1,
  attributes: {
    title: 'host.name',
    description: '',
    visualizationType: 'lnsXY',
    state: {
      visualization: {
        title: 'Empty XY chart',
        legend: {
          isVisible: true,
          position: 'right',
        },
        valueLabels: 'hide',
        preferredSeriesType: 'bar_stacked',
        layers: [
          {
            layerId: '3a296a6e-c934-4a52-8149-e8cc3718b384',
            accessors: ['03b01787-c48a-4ff2-9051-8c20f0ad9fec'],
            position: 'top',
            seriesType: 'area',
            showGridlines: false,
            layerType: 'data',
            xAccessor: '38cf8975-5e61-41bb-8965-f8502f450426',
          },
        ],
        yRightExtent: {
          mode: 'full',
        },
        yLeftExtent: {
          mode: 'full',
        },
      },
      query: {
        query: '',
        language: 'kuery',
      },
      filters: [],
      datasourceStates: {
        indexpattern: {
          layers: {
            '3a296a6e-c934-4a52-8149-e8cc3718b384': {
              columns: {
                '38cf8975-5e61-41bb-8965-f8502f450426': {
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
                '03b01787-c48a-4ff2-9051-8c20f0ad9fec': {
                  label: 'Unique count of host.name',
                  dataType: 'number',
                  operationType: 'unique_count',
                  scale: 'ratio',
                  sourceField: 'host.name',
                  isBucketed: false,
                },
              },
              columnOrder: [
                '38cf8975-5e61-41bb-8965-f8502f450426',
                '03b01787-c48a-4ff2-9051-8c20f0ad9fec',
              ],
              incompleteColumns: {},
            },
          },
        },
      },
    },
  },
  references: [
    {
      type: 'index-pattern',
      id: 'ad53fa40-42f7-11ec-a42d-e31ddad596f0',
      name: 'indexpattern-datasource-current-indexpattern',
    },
    {
      type: 'index-pattern',
      id: 'ad53fa40-42f7-11ec-a42d-e31ddad596f0',
      name: 'indexpattern-datasource-layer-3a296a6e-c934-4a52-8149-e8cc3718b384',
    },
  ],
  migrationVersion: {
    lens: '8.0.0',
  },
  coreMigrationVersion: '8.1.0',
};
