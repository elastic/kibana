/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensAttributes } from '../../types';

export const kpiTotalUsersMetricLensAttributes: LensAttributes = {
  description: '',
  state: {
    datasourceStates: {
      formBased: {
        layers: {
          '416b6fad-1923-4f6a-a2df-b223bb287e30': {
            columnOrder: ['3e51b035-872c-4b44-824b-fe069c222e91'],
            columns: {
              '3e51b035-872c-4b44-824b-fe069c222e91': {
                dataType: 'number',
                isBucketed: false,
                label: ' ',
                operationType: 'unique_count',
                scale: 'ratio',
                sourceField: 'user.name',
                customLabel: true,
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
      accessor: '3e51b035-872c-4b44-824b-fe069c222e91',
      layerId: '416b6fad-1923-4f6a-a2df-b223bb287e30',
      layerType: 'data',
    },
  },
  title: '[User] Users - metric',
  visualizationType: 'lnsLegacyMetric',
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
