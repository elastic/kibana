/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const maxRiskScoreHistogram = {
  attributes: {
    description: null,
    state: {
      datasourceStates: {
        indexpattern: {
          layers: {
            'b885eaad-3c68-49ad-9891-70158d912dbd': {
              columnOrder: [
                '8dcda7ec-1a1a-43b3-b0b8-e702943eed5c',
                'e82aed80-ee04-4ad1-9b9d-fde4a25be58a',
                'aa4ad9b2-8829-4517-aaa8-7ed7e5793e9b',
              ],
              columns: {
                '8dcda7ec-1a1a-43b3-b0b8-e702943eed5c': {
                  customLabel: true,
                  dataType: 'string',
                  isBucketed: true,
                  label: 'Host Name',
                  operationType: 'terms',
                  params: {
                    missingBucket: false,
                    orderBy: { columnId: 'aa4ad9b2-8829-4517-aaa8-7ed7e5793e9b', type: 'column' },
                    orderDirection: 'desc',
                    otherBucket: true,
                    size: 20,
                  },
                  scale: 'ordinal',
                  sourceField: 'host.name',
                },
                'aa4ad9b2-8829-4517-aaa8-7ed7e5793e9b': {
                  customLabel: true,
                  dataType: 'number',
                  isBucketed: false,
                  label: 'Cumulative Risk Score',
                  operationType: 'max',
                  scale: 'ratio',
                  sourceField: 'risk_stats.risk_score',
                },
                'e82aed80-ee04-4ad1-9b9d-fde4a25be58a': {
                  dataType: 'date',
                  isBucketed: true,
                  label: '@timestamp',
                  operationType: 'date_histogram',
                  params: { interval: '1h' },
                  scale: 'interval',
                  sourceField: '@timestamp',
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
        layers: [
          {
            accessors: ['aa4ad9b2-8829-4517-aaa8-7ed7e5793e9b'],
            layerId: 'b885eaad-3c68-49ad-9891-70158d912dbd',
            palette: { name: 'default', type: 'palette' },
            position: 'top',
            seriesType: 'bar_stacked',
            showGridlines: false,
            splitAccessor: '8dcda7ec-1a1a-43b3-b0b8-e702943eed5c',
            xAccessor: 'e82aed80-ee04-4ad1-9b9d-fde4a25be58a',
          },
        ],
        legend: { isVisible: true, position: 'right' },
        preferredSeriesType: 'bar_stacked',
        title: 'Empty XY chart',
        valueLabels: 'hide',
      },
    },
    title: 'Host Risk Score (Max Risk Score Histogram)',
    visualizationType: 'lnsXY',
  },
  coreMigrationVersion: '7.13.4',
  id: 'd3f72670-d3a0-11eb-bd37-7bb50422e346',
  migrationVersion: { lens: '7.13.1' },
  references: [
    {
      id: 'ml-host-risk-score-<REPLACE-WITH-SPACE>-index-pattern',
      name: 'indexpattern-datasource-current-indexpattern',
      type: 'index-pattern',
    },
    {
      id: 'ml-host-risk-score-<REPLACE-WITH-SPACE>-index-pattern',
      name: 'indexpattern-datasource-layer-b885eaad-3c68-49ad-9891-70158d912dbd',
      type: 'index-pattern',
    },
  ],
  type: 'lens',
  updated_at: '2021-08-18T18:48:30.689Z',
  version: 'WzM4NDc0NSwxXQ==',
};
