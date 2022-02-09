/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const kpiUniquePrivateIpsDestinationArea = {
  attributes: {
    description: '',
    state: {
      datasourceStates: {
        indexpattern: {
          layers: {
            'cea37c70-8f91-43bf-b9fe-72d8c049f6a3': {
              columnOrder: [
                '7f1fe123-1b99-4d67-b14e-54d0b95d2cf5',
                'bd17c23e-4f83-4108-8005-2669170d064b',
              ],
              columns: {
                '7f1fe123-1b99-4d67-b14e-54d0b95d2cf5': {
                  dataType: 'date',
                  isBucketed: true,
                  label: '@timestamp',
                  operationType: 'date_histogram',
                  params: { interval: 'auto' },
                  scale: 'interval',
                  sourceField: '@timestamp',
                },
                'bd17c23e-4f83-4108-8005-2669170d064b': {
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
      query: {
        language: 'kuery',
        query:
          'source.ip: "10.0.0.0/8" or source.ip: "192.168.0.0/16" or source.ip: "172.16.0.0/12" or source.ip: "fd00::/8"',
      },
      visualization: {
        axisTitlesVisibilitySettings: { x: true, yLeft: true, yRight: true },
        fittingFunction: 'None',
        gridlinesVisibilitySettings: { x: true, yLeft: true, yRight: true },
        labelsOrientation: { x: 0, yLeft: 0, yRight: 0 },
        layers: [
          {
            accessors: ['bd17c23e-4f83-4108-8005-2669170d064b'],
            layerId: 'cea37c70-8f91-43bf-b9fe-72d8c049f6a3',
            layerType: 'data',
            seriesType: 'area',
            xAccessor: '7f1fe123-1b99-4d67-b14e-54d0b95d2cf5',
          },
        ],
        legend: { isVisible: true, position: 'right' },
        preferredSeriesType: 'area',
        tickLabelsVisibilitySettings: { x: true, yLeft: true, yRight: true },
        valueLabels: 'hide',
        yLeftExtent: { mode: 'full' },
        yRightExtent: { mode: 'full' },
      },
    },
    title: '[Network] KPI Unique private IPs - destination area',
    visualizationType: 'lnsXY',
  },
  coreMigrationVersion: '8.0.0',
  id: '1db86980-88f6-11ec-a228-d39f94ca1d1c',
  migrationVersion: { lens: '8.0.0' },
  references: [
    {
      id: 'security-solution-default',
      name: 'indexpattern-datasource-current-indexpattern',
      type: 'index-pattern',
    },
    {
      id: 'security-solution-default',
      name: 'indexpattern-datasource-layer-cea37c70-8f91-43bf-b9fe-72d8c049f6a3',
      type: 'index-pattern',
    },
  ],
  type: 'lens',
  updated_at: '2022-02-08T15:45:18.367Z',
  version: 'WzI0NzM1MSwzXQ==',
};
