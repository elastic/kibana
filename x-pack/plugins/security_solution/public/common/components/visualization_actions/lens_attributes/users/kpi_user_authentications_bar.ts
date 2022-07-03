/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LensAttributes } from '../../types';
import { FAIL_CHART_LABEL, SUCCESS_CHART_LABEL } from '../../translations';

export const kpiUserAuthenticationsBarLensAttributes: LensAttributes = {
  title: '[Host] User authentications - bar ',
  description: '',
  visualizationType: 'lnsXY',
  state: {
    visualization: {
      axisTitlesVisibilitySettings: {
        x: false,
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
          accessors: ['938b445a-a291-4bbc-84fe-4f47b69c20e4'],
          layerId: '31213ae3-905b-4e88-b987-0cccb1f3209f',
          layerType: 'data',
          seriesType: 'bar_horizontal_stacked',
          xAccessor: '430e690c-9992-414f-9bce-00812d99a5e7',
          yConfig: [],
        },
        {
          accessors: ['c8165fc3-7180-4f1b-8c87-bc3ea04c6df7'],
          layerId: 'b9acd453-f476-4467-ad38-203e37b73e55',
          layerType: 'data',
          seriesType: 'bar_horizontal_stacked',
          xAccessor: 'e959c351-a3a2-4525-b244-9623f215a8fd',
          yConfig: [
            {
              color: '#e7664c',
              forAccessor: 'c8165fc3-7180-4f1b-8c87-bc3ea04c6df7',
            },
          ],
        },
      ],
      legend: {
        isVisible: false,
        position: 'right',
        showSingleSeries: false,
      },
      preferredSeriesType: 'bar_horizontal_stacked',
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
              '430e690c-9992-414f-9bce-00812d99a5e7',
              '938b445a-a291-4bbc-84fe-4f47b69c20e4',
            ],
            columns: {
              '430e690c-9992-414f-9bce-00812d99a5e7': {
                dataType: 'string',
                isBucketed: true,
                label: 'Filters',
                operationType: 'filters',
                params: {
                  filters: [
                    {
                      input: {
                        language: 'kuery',
                        query: 'event.outcome : "success" ',
                      },
                      label: SUCCESS_CHART_LABEL,
                    },
                  ],
                },
                scale: 'ordinal',
              },
              '938b445a-a291-4bbc-84fe-4f47b69c20e4': {
                dataType: 'number',
                isBucketed: false,
                label: SUCCESS_CHART_LABEL,
                operationType: 'count',
                scale: 'ratio',
                sourceField: '___records___',
              },
            },
            incompleteColumns: {},
          },
          'b9acd453-f476-4467-ad38-203e37b73e55': {
            columnOrder: [
              'e959c351-a3a2-4525-b244-9623f215a8fd',
              'c8165fc3-7180-4f1b-8c87-bc3ea04c6df7',
            ],
            columns: {
              'c8165fc3-7180-4f1b-8c87-bc3ea04c6df7': {
                dataType: 'number',
                isBucketed: false,
                label: 'Fail',
                operationType: 'count',
                scale: 'ratio',
                sourceField: '___records___',
              },
              'e959c351-a3a2-4525-b244-9623f215a8fd': {
                customLabel: true,
                dataType: 'string',
                isBucketed: true,
                label: FAIL_CHART_LABEL,
                operationType: 'filters',
                params: {
                  filters: [
                    {
                      input: {
                        language: 'kuery',
                        query: 'event.outcome:"failure" ',
                      },
                      label: FAIL_CHART_LABEL,
                    },
                  ],
                },
                scale: 'ordinal',
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
      type: 'index-pattern',
      id: '{dataViewId}',
      name: 'indexpattern-datasource-current-indexpattern',
    },
    {
      type: 'index-pattern',
      id: '{dataViewId}',
      name: 'indexpattern-datasource-layer-31213ae3-905b-4e88-b987-0cccb1f3209f',
    },
    {
      type: 'index-pattern',
      id: '{dataViewId}',
      name: 'indexpattern-datasource-layer-b9acd453-f476-4467-ad38-203e37b73e55',
    },
  ],
} as LensAttributes;
