/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LensAttributes } from '../../types';

export const kpiUniqueIpsDestinationMetricLensAttributes: LensAttributes = {
  description: '',
  state: {
    datasourceStates: {
      indexpattern: {
        layers: {
          '8be0156b-d423-4a39-adf1-f54d4c9f2e69': {
            columnOrder: ['d9a6eb6b-8b78-439e-98e7-a718f8ffbebe'],
            columns: {
              'd9a6eb6b-8b78-439e-98e7-a718f8ffbebe': {
                customLabel: true,
                dataType: 'number',
                isBucketed: false,
                label: ' ',
                operationType: 'unique_count',
                scale: 'ratio',
                sourceField: 'destination.ip',
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
      accessor: 'd9a6eb6b-8b78-439e-98e7-a718f8ffbebe',
      layerId: '8be0156b-d423-4a39-adf1-f54d4c9f2e69',
      layerType: 'data',
    },
  },
  title: '[Host] Unique IPs - destination metric',
  visualizationType: 'lnsMetric',
  references: [
    {
      id: '{dataViewId}',
      name: 'indexpattern-datasource-current-indexpattern',
      type: 'index-pattern',
    },
    {
      id: '{dataViewId}',
      name: 'indexpattern-datasource-layer-8be0156b-d423-4a39-adf1-f54d4c9f2e69',
      type: 'index-pattern',
    },
  ],
} as LensAttributes;
