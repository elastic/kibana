/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MATRIX_HISTOGRAM_TEMPLATE_TYPE } from '../../common/constants';

export const hostName = {
  id: '6853a880-5451-99ec-b0fd-2f7a10a18ba6',
  title: '[Security Solution] KPI Hosts',
  description: '',
  visualizationType: 'lnsXY',
  state: {
    visualization: {
      legend: {
        isVisible: true,
        position: 'right',
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
        x: true,
        yLeft: true,
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
          layerId: 'f6172bed-07e8-48fc-b9e4-2291fe061aed',
          accessors: ['6e680915-0114-489c-9d5b-2149eb4ab6a7'],
          position: 'top',
          seriesType: 'area',
          showGridlines: false,
          layerType: 'data',
          xAccessor: 'e79c098a-a6c3-45c5-9608-21a7f76e6d5d',
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
          'f6172bed-07e8-48fc-b9e4-2291fe061aed': {
            columns: {
              'e79c098a-a6c3-45c5-9608-21a7f76e6d5d': {
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
              '6e680915-0114-489c-9d5b-2149eb4ab6a7': {
                label: 'Unique count of host.name',
                dataType: 'number',
                operationType: 'unique_count',
                scale: 'ratio',
                sourceField: 'host.name',
                isBucketed: false,
              },
            },
            columnOrder: [
              'e79c098a-a6c3-45c5-9608-21a7f76e6d5d',
              '6e680915-0114-489c-9d5b-2149eb4ab6a7',
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
      id: 'security-solution-default',
      name: 'indexpattern-datasource-current-indexpattern',
    },
    {
      type: 'index-pattern',
      id: 'security-solution-default',
      name: 'indexpattern-datasource-layer-f6172bed-07e8-48fc-b9e4-2291fe061aed',
    },
    {
      type: 'tag',
      id: '6853a880-5451-11ec-b0fd-2f7a10a18ba6',
      name: 'tag-ref-6853a880-5451-11ec-b0fd-2f7a10a18ba6',
    },
  ],
};
