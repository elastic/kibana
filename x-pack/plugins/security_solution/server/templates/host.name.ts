/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MATRIX_HISTOGRAM_TEMPLATE_TYPE } from '../../common/constants';

export const hostName = {
  id: 'e25f6260-42f7-11ec-a42d-e31ddad596f0',
  type: MATRIX_HISTOGRAM_TEMPLATE_TYPE,
  namespaces: ['default'],
  updated_at: '2021-11-11T14:01:36.394Z',
  version: 1,
  attributes: {
    title: '',
    description: '',
    visualizationType: 'lnsXY',
    type: 'lens',
    references: [
      {
        type: 'index-pattern',
        id: '{{indexPatternId}}',
        name: 'indexpattern-datasource-current-indexpattern',
      },
      {
        type: 'index-pattern',
        id: '{{indexPatternId}}',
        name: 'indexpattern-datasource-layer-f05712e9-7b31-4684-a470-127afd8659de',
      },
    ],
    state: {
      visualization: {
        yRightExtent: {
          mode: 'full',
        },
        valueLabels: 'hide',
        preferredSeriesType: 'bar_stacked',
        legend: {
          isVisible: true,
          position: 'right',
        },
        layers: [
          {
            layerType: 'data',
            xAccessor: 'f43d9f45-54b3-4b87-97a7-e31c5d59fb06',
            layerId: 'f05712e9-7b31-4684-a470-127afd8659de',
            accessors: ['e60e4ba2-024a-4785-8931-c85eb4ded81d'],
            seriesType: 'line',
            showGridlines: false,
            position: 'top',
          },
        ],
        yLeftExtent: {
          mode: 'full',
        },
        title: 'Empty XY chart',
      },
      query: {
        query: '',
        language: 'kuery',
      },
      filters: [],
      datasourceStates: {
        indexpattern: {
          layers: {
            'f05712e9-7b31-4684-a470-127afd8659de': {
              columnOrder: [
                'f43d9f45-54b3-4b87-97a7-e31c5d59fb06',
                'e60e4ba2-024a-4785-8931-c85eb4ded81d',
              ],
              columns: {
                'e60e4ba2-024a-4785-8931-c85eb4ded81d': {
                  sourceField: 'host.name',
                  isBucketed: false,
                  dataType: 'number',
                  scale: 'ratio',
                  operationType: 'unique_count',
                  label: 'Unique count of host.name',
                },
                'f43d9f45-54b3-4b87-97a7-e31c5d59fb06': {
                  sourceField: '@timestamp',
                  isBucketed: true,
                  dataType: 'date',
                  scale: 'interval',
                  operationType: 'date_histogram',
                  label: '@timestamp',
                  params: {
                    interval: 'auto',
                  },
                },
              },
              incompleteColumns: {},
            },
          },
        },
      },
    },
  },
  migrationVersion: {
    lens: '8.0.0',
  },
  coreMigrationVersion: '8.1.0',
};
