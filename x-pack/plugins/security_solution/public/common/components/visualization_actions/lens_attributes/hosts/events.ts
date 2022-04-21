/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GetLensAttributes, LensAttributes } from '../../types';

export const getEventsHistogramLensAttributes: GetLensAttributes = (
  stackByField = 'event.action'
) =>
  ({
    title: 'Host - events',
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
            layerId: '0039eb0c-9a1a-4687-ae54-0f4e239bec75',
            accessors: ['e09e0380-0740-4105-becc-0a4ca12e3944'],
            position: 'top',
            seriesType: 'bar_stacked',
            showGridlines: false,
            layerType: 'data',
            xAccessor: 'aac9d7d0-13a3-480a-892b-08207a787926',
            splitAccessor: '34919782-4546-43a5-b668-06ac934d3acd',
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
      filters: [],
      datasourceStates: {
        indexpattern: {
          layers: {
            '0039eb0c-9a1a-4687-ae54-0f4e239bec75': {
              columns: {
                'aac9d7d0-13a3-480a-892b-08207a787926': {
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
                'e09e0380-0740-4105-becc-0a4ca12e3944': {
                  label: 'Count of records',
                  dataType: 'number',
                  operationType: 'count',
                  isBucketed: false,
                  scale: 'ratio',
                  sourceField: '___records___',
                },
                '34919782-4546-43a5-b668-06ac934d3acd': {
                  label: `Top values of ${stackByField}`, // could be event.dataset or event.module
                  dataType: 'string',
                  operationType: 'terms',
                  scale: 'ordinal',
                  sourceField: `${stackByField}`, // could be event.dataset or event.module
                  isBucketed: true,
                  params: {
                    size: 10,
                    orderBy: {
                      type: 'column',
                      columnId: 'e09e0380-0740-4105-becc-0a4ca12e3944',
                    },
                    orderDirection: 'asc',
                    otherBucket: true,
                    missingBucket: false,
                    parentFormat: {
                      id: 'terms',
                    },
                  },
                },
              },
              columnOrder: [
                '34919782-4546-43a5-b668-06ac934d3acd',
                'aac9d7d0-13a3-480a-892b-08207a787926',
                'e09e0380-0740-4105-becc-0a4ca12e3944',
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
        name: 'indexpattern-datasource-layer-0039eb0c-9a1a-4687-ae54-0f4e239bec75',
      },
    ],
  } as LensAttributes);
