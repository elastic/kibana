/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LensAttributes } from '../../types';

export const kpiHostMetricLensAttributes: LensAttributes = {
  description: '',
  state: {
    datasourceStates: {
      indexpattern: {
        layers: {
          '416b6fad-1923-4f6a-a2df-b223bb287e30': {
            columnOrder: ['b00c65ea-32be-4163-bfc8-f795b1ef9d06'],
            columns: {
              'b00c65ea-32be-4163-bfc8-f795b1ef9d06': {
                customLabel: true,
                dataType: 'number',
                isBucketed: false,
                label: ' ',
                operationType: 'unique_count',
                scale: 'ratio',
                sourceField: 'host.name',
              },
            },
            incompleteColumns: {},
          },
        },
      },
    },
    filters: [],
    query: { language: 'kuery', query: '' },
    visualization: {
      accessor: 'b00c65ea-32be-4163-bfc8-f795b1ef9d06',
      layerId: '416b6fad-1923-4f6a-a2df-b223bb287e30',
      layerType: 'data',
    },
  },
  title: '[Host] Hosts - metric',
  visualizationType: 'lnsMetric',
  references: [
    {
      id: '{dataViewId}',
      name: 'indexpattern-datasource-current-indexpattern',
      type: 'index-pattern',
    },
    {
      id: '{dataViewId}',
      name: 'indexpattern-datasource-layer-416b6fad-1923-4f6a-a2df-b223bb287e30',
      type: 'index-pattern',
    },
  ],
} as LensAttributes;
