/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { LensAttributes } from '../../types';

export const kpiUniquePrivateIpsAreaLensAttributes: LensAttributes = {
  title: '[Network] Unique private IPs - area chart',
  description: '',
  visualizationType: 'lnsXY',
  state: {
    visualization: {
      legend: {
        isVisible: false,
        position: 'right',
        showSingleSeries: false,
      },
      valueLabels: 'hide',
      fittingFunction: 'None',
      yLeftExtent: {
        mode: 'full',
      },
      yRightExtent: {
        mode: 'full',
      },
      axisTitlesVisibilitySettings: {
        x: false,
        yLeft: false,
        yRight: true,
      },
      tickLabelsVisibilitySettings: {
        x: true,
        yLeft: true,
        yRight: true,
      },
      labelsOrientation: {
        x: 0,
        yLeft: 0,
        yRight: 0,
      },
      gridlinesVisibilitySettings: {
        x: true,
        yLeft: true,
        yRight: true,
      },
      preferredSeriesType: 'area',
      layers: [
        {
          layerId: '38aa6532-6bf9-4c8f-b2a6-da8d32f7d0d7',
          seriesType: 'area',
          accessors: ['5f317308-cfbb-4ee5-bfb9-07653184fabf'],
          layerType: 'data',
          xAccessor: '662cd5e5-82bf-4325-a703-273f84b97e09',
          yConfig: [
            {
              forAccessor: '5f317308-cfbb-4ee5-bfb9-07653184fabf',
              color: '#d36186',
            },
          ],
        },
        {
          layerId: '72dc4b99-b07d-4dc9-958b-081d259e11fa',
          seriesType: 'area',
          accessors: ['ac1eb80c-ddde-46c4-a90c-400261926762'],
          layerType: 'data',
          xAccessor: '36444b8c-7e10-4069-8298-6c1b46912be2',
          yConfig: [
            {
              forAccessor: 'ac1eb80c-ddde-46c4-a90c-400261926762',
              color: '#9170b8',
            },
          ],
        },
      ],
    },
    query: {
      query: '',
      language: 'kuery',
    },
    filters: [],
    datasourceStates: {
      indexpattern: {
        layers: {
          '38aa6532-6bf9-4c8f-b2a6-da8d32f7d0d7': {
            columns: {
              '662cd5e5-82bf-4325-a703-273f84b97e09': {
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
              '5f317308-cfbb-4ee5-bfb9-07653184fabf': {
                label: 'Src.',
                dataType: 'number',
                operationType: 'unique_count',
                scale: 'ratio',
                sourceField: 'source.ip',
                isBucketed: false,
                customLabel: true,
                filter: {
                  query:
                    '"source.ip": "10.0.0.0/8" or "source.ip": "192.168.0.0/16" or "source.ip": "172.16.0.0/12" or "source.ip": "fd00::/8"',
                  language: 'kuery',
                },
              },
            },
            columnOrder: [
              '662cd5e5-82bf-4325-a703-273f84b97e09',
              '5f317308-cfbb-4ee5-bfb9-07653184fabf',
            ],
            incompleteColumns: {},
          },
          '72dc4b99-b07d-4dc9-958b-081d259e11fa': {
            columns: {
              '36444b8c-7e10-4069-8298-6c1b46912be2': {
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
              'ac1eb80c-ddde-46c4-a90c-400261926762': {
                label: 'Dest.',
                dataType: 'number',
                operationType: 'unique_count',
                scale: 'ratio',
                sourceField: 'destination.ip',
                isBucketed: false,
                filter: {
                  query:
                    '"destination.ip": "10.0.0.0/8" or "destination.ip": "192.168.0.0/16" or "destination.ip": "172.16.0.0/12" or "destination.ip": "fd00::/8"',
                  language: 'kuery',
                },
              },
            },
            columnOrder: [
              '36444b8c-7e10-4069-8298-6c1b46912be2',
              'ac1eb80c-ddde-46c4-a90c-400261926762',
            ],
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
      name: 'indexpattern-datasource-layer-38aa6532-6bf9-4c8f-b2a6-da8d32f7d0d7',
    },
    {
      type: 'index-pattern',
      id: '{dataViewId}',
      name: 'indexpattern-datasource-layer-72dc4b99-b07d-4dc9-958b-081d259e11fa',
    },
  ],
} as LensAttributes;
