/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LensAttributes } from '../../types';

export const authenticationLensAttributes: LensAttributes = {
  title: 'Authentication',
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
          layerId: '3fd0c5d5-f762-4a27-8c56-14eee0223e13',
          accessors: ['5417777d-d9d9-4268-9cdc-eb29b873bd65'],
          position: 'top',
          seriesType: 'bar_stacked',
          showGridlines: false,
          layerType: 'data',
          xAccessor: 'b41a2958-650b-470a-84c4-c6fd8f0c6d37',
          yConfig: [
            {
              forAccessor: '5417777d-d9d9-4268-9cdc-eb29b873bd65',
              color: '#54b399',
            },
          ],
        },
        {
          layerId: 'bef502be-e5ff-442f-9e3e-229f86ca2afa',
          seriesType: 'bar_stacked',
          accessors: ['a3bf9dc1-c8d2-42d6-9e60-31892a4c509e'],
          layerType: 'data',
          xAccessor: 'cded27f7-8ef8-458c-8d9b-70db48ae340d',
          yConfig: [
            {
              forAccessor: 'a3bf9dc1-c8d2-42d6-9e60-31892a4c509e',
              color: '#da8b45',
            },
          ],
        },
      ],
      yRightExtent: {
        mode: 'full',
      },
      yLeftExtent: {
        mode: 'full',
      },
      axisTitlesVisibilitySettings: {
        x: false,
        yLeft: false,
        yRight: true,
      },
    },
    query: {
      query: '',
      language: 'kuery',
    },
    filters: [
      {
        meta: {
          index: '6f4dbdc7-35b6-4e20-ac53-1272167e3919',
          type: 'custom',
          disabled: false,
          negate: false,
          alias: null,
          key: 'query',
          value: '{"bool":{"must":[{"term":{"event.category":"authentication"}}]}}',
        },
        $state: {
          store: 'appState',
        },
        query: {
          bool: {
            must: [
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
          '3fd0c5d5-f762-4a27-8c56-14eee0223e13': {
            columns: {
              'b41a2958-650b-470a-84c4-c6fd8f0c6d37': {
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
              '5417777d-d9d9-4268-9cdc-eb29b873bd65': {
                label: 'Success',
                dataType: 'number',
                operationType: 'count',
                isBucketed: false,
                scale: 'ratio',
                sourceField: '___records___',
                filter: {
                  query: 'event.outcome : "success"',
                  language: 'kuery',
                },
                customLabel: true,
              },
            },
            columnOrder: [
              'b41a2958-650b-470a-84c4-c6fd8f0c6d37',
              '5417777d-d9d9-4268-9cdc-eb29b873bd65',
            ],
            incompleteColumns: {},
          },
          'bef502be-e5ff-442f-9e3e-229f86ca2afa': {
            columns: {
              'cded27f7-8ef8-458c-8d9b-70db48ae340d': {
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
              'a3bf9dc1-c8d2-42d6-9e60-31892a4c509e': {
                label: 'Failure',
                dataType: 'number',
                operationType: 'count',
                isBucketed: false,
                scale: 'ratio',
                sourceField: '___records___',
                filter: {
                  query: 'event.outcome : "failure"',
                  language: 'kuery',
                },
                customLabel: true,
              },
            },
            columnOrder: [
              'cded27f7-8ef8-458c-8d9b-70db48ae340d',
              'a3bf9dc1-c8d2-42d6-9e60-31892a4c509e',
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
      name: 'indexpattern-datasource-layer-3fd0c5d5-f762-4a27-8c56-14eee0223e13',
    },
    {
      type: 'index-pattern',
      id: '{dataViewId}',
      name: 'indexpattern-datasource-layer-bef502be-e5ff-442f-9e3e-229f86ca2afa',
    },
    {
      type: 'index-pattern',
      name: '6f4dbdc7-35b6-4e20-ac53-1272167e3919',
      id: '{dataViewId}',
    },
  ],
} as LensAttributes;
