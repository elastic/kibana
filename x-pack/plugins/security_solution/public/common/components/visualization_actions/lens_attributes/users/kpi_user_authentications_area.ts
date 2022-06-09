/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LensAttributes } from '../../types';

export const kpiUserAuthenticationsAreaLensAttributes: LensAttributes = {
  title: '[Host] User authentications - area ',
  description: '',
  visualizationType: 'lnsXY',
  state: {
    visualization: {
      axisTitlesVisibilitySettings: {
        x: true,
        yLeft: false,
        yRight: true,
      },
      fittingFunction: 'None',
      gridlinesVisibilitySettings: {
        x: true,
        yLeft: true,
        yRight: true,
      },
      labelsOrientation: {
        x: 0,
        yLeft: 0,
        yRight: 0,
      },
      layers: [
        {
          accessors: ['0eb97c09-a351-4280-97da-944e4bd30dd7'],
          layerId: '4590dafb-4ac7-45aa-8641-47a3ff0b817c',
          layerType: 'data',
          seriesType: 'area',
          xAccessor: '49a42fe6-ebe8-4adb-8eed-1966a5297b7e',
          yConfig: [
            {
              color: '#54b399',
              forAccessor: '0eb97c09-a351-4280-97da-944e4bd30dd7',
            },
          ],
        },
        {
          accessors: ['2b27c80e-a20d-46f1-8fb2-79626ef4563c'],
          layerId: '31213ae3-905b-4e88-b987-0cccb1f3209f',
          layerType: 'data',
          seriesType: 'area',
          xAccessor: '33a6163d-0c0a-451d-aa38-8ca6010dd5bf',
          yConfig: [
            {
              color: '#e7664c',
              forAccessor: '2b27c80e-a20d-46f1-8fb2-79626ef4563c',
            },
          ],
        },
      ],
      legend: {
        isVisible: false,
        position: 'right',
        showSingleSeries: false,
      },
      preferredSeriesType: 'area',
      tickLabelsVisibilitySettings: {
        x: true,
        yLeft: true,
        yRight: true,
      },
      valueLabels: 'hide',
      yLeftExtent: {
        mode: 'full',
      },
      yRightExtent: {
        mode: 'full',
      },
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
          '31213ae3-905b-4e88-b987-0cccb1f3209f': {
            columnOrder: [
              '33a6163d-0c0a-451d-aa38-8ca6010dd5bf',
              '2b27c80e-a20d-46f1-8fb2-79626ef4563c',
            ],
            columns: {
              '2b27c80e-a20d-46f1-8fb2-79626ef4563c': {
                customLabel: true,
                dataType: 'number',
                filter: {
                  language: 'kuery',
                  query: 'event.outcome: "failure" ',
                },
                isBucketed: false,
                label: 'Fail',
                operationType: 'count',
                scale: 'ratio',
                sourceField: '___records___',
              },
              '33a6163d-0c0a-451d-aa38-8ca6010dd5bf': {
                dataType: 'date',
                isBucketed: true,
                label: '@timestamp',
                operationType: 'date_histogram',
                params: {
                  interval: 'auto',
                },
                scale: 'interval',
                sourceField: '@timestamp',
              },
            },
            incompleteColumns: {},
          },
          '4590dafb-4ac7-45aa-8641-47a3ff0b817c': {
            columnOrder: [
              '49a42fe6-ebe8-4adb-8eed-1966a5297b7e',
              '0eb97c09-a351-4280-97da-944e4bd30dd7',
            ],
            columns: {
              '0eb97c09-a351-4280-97da-944e4bd30dd7': {
                customLabel: true,
                dataType: 'number',
                filter: {
                  language: 'kuery',
                  query: 'event.outcome : "success" ',
                },
                isBucketed: false,
                label: 'Succ.',
                operationType: 'count',
                scale: 'ratio',
                sourceField: '___records___',
              },
              '49a42fe6-ebe8-4adb-8eed-1966a5297b7e': {
                dataType: 'date',
                isBucketed: true,
                label: '@timestamp',
                operationType: 'date_histogram',
                params: {
                  interval: 'auto',
                },
                scale: 'interval',
                sourceField: '@timestamp',
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
      type: '{dataViewId}',
      id: 'security-solution-default',
      name: 'indexpattern-datasource-current-indexpattern',
    },
    {
      type: '{dataViewId}',
      id: 'security-solution-default',
      name: 'indexpattern-datasource-layer-31213ae3-905b-4e88-b987-0cccb1f3209f',
    },
    {
      type: '{dataViewId}',
      id: 'security-solution-default',
      name: 'indexpattern-datasource-layer-4590dafb-4ac7-45aa-8641-47a3ff0b817c',
    },
  ],
} as LensAttributes;
