/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LensAttributes } from '../../types';

export const kpiTotalUsersAreaLensAttributes: LensAttributes = {
  description: '',
  state: {
    datasourceStates: {
      indexpattern: {
        layers: {
          '416b6fad-1923-4f6a-a2df-b223bb287e30': {
            columnOrder: [
              '5eea817b-67b7-4268-8ecb-7688d1094721',
              'b00c65ea-32be-4163-bfc8-f795b1ef9d06',
            ],
            columns: {
              '5eea817b-67b7-4268-8ecb-7688d1094721': {
                dataType: 'date',
                isBucketed: true,
                label: '@timestamp',
                operationType: 'date_histogram',
                params: { interval: 'auto' },
                scale: 'interval',
                sourceField: '@timestamp',
              },
              'b00c65ea-32be-4163-bfc8-f795b1ef9d06': {
                customLabel: true,
                dataType: 'number',
                isBucketed: false,
                label: ' ',
                operationType: 'unique_count',
                scale: 'ratio',
                sourceField: 'user.name',
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
      axisTitlesVisibilitySettings: { x: false, yLeft: false, yRight: false },
      fittingFunction: 'None',
      gridlinesVisibilitySettings: { x: true, yLeft: true, yRight: true },
      labelsOrientation: { x: 0, yLeft: 0, yRight: 0 },
      layers: [
        {
          accessors: ['b00c65ea-32be-4163-bfc8-f795b1ef9d06'],
          layerId: '416b6fad-1923-4f6a-a2df-b223bb287e30',
          layerType: 'data',
          seriesType: 'area',
          xAccessor: '5eea817b-67b7-4268-8ecb-7688d1094721',
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
  title: '[User] Users - area',
  visualizationType: 'lnsXY',
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
