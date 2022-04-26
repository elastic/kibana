/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LensAttributes } from '../../types';
import { SOURCE_CHART_LABEL, DESTINATION_CHART_LABEL } from '../../translations';

export const kpiUniqueIpsBarLensAttributes: LensAttributes = {
  description: '',
  state: {
    datasourceStates: {
      indexpattern: {
        layers: {
          '8be0156b-d423-4a39-adf1-f54d4c9f2e69': {
            columnOrder: [
              'f8bfa719-5c1c-4bf2-896e-c318d77fc08e',
              '32f66676-f4e1-48fd-b7f8-d4de38318601',
            ],
            columns: {
              '32f66676-f4e1-48fd-b7f8-d4de38318601': {
                dataType: 'number',
                isBucketed: false,
                label: 'Unique count of source.ip',
                operationType: 'unique_count',
                scale: 'ratio',
                sourceField: 'source.ip',
              },
              'f8bfa719-5c1c-4bf2-896e-c318d77fc08e': {
                dataType: 'string',
                isBucketed: true,
                label: 'Filters',
                operationType: 'filters',
                params: {
                  filters: [{ input: { language: 'kuery', query: '' }, label: SOURCE_CHART_LABEL }],
                },
                scale: 'ordinal',
              },
            },
            incompleteColumns: {},
          },
          'ec84ba70-2adb-4647-8ef0-8ad91a0e6d4e': {
            columnOrder: [
              'c72aad6a-fc9c-43dc-9194-e13ca3ee8aff',
              'b7e59b08-96e6-40d1-84fd-e97b977d1c47',
            ],
            columns: {
              'b7e59b08-96e6-40d1-84fd-e97b977d1c47': {
                dataType: 'number',
                isBucketed: false,
                label: 'Unique count of destination.ip',
                operationType: 'unique_count',
                scale: 'ratio',
                sourceField: 'destination.ip',
              },
              'c72aad6a-fc9c-43dc-9194-e13ca3ee8aff': {
                customLabel: true,
                dataType: 'string',
                isBucketed: true,
                label: DESTINATION_CHART_LABEL,
                operationType: 'filters',
                params: {
                  filters: [{ input: { language: 'kuery', query: '' }, label: 'Dest.' }],
                },
                scale: 'ordinal',
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
      axisTitlesVisibilitySettings: { x: false, yLeft: false, yRight: true },
      fittingFunction: 'None',
      gridlinesVisibilitySettings: { x: true, yLeft: true, yRight: true },
      labelsOrientation: { x: 0, yLeft: 0, yRight: 0 },
      layers: [
        {
          accessors: ['32f66676-f4e1-48fd-b7f8-d4de38318601'],
          layerId: '8be0156b-d423-4a39-adf1-f54d4c9f2e69',
          layerType: 'data',
          seriesType: 'bar_horizontal_stacked',
          xAccessor: 'f8bfa719-5c1c-4bf2-896e-c318d77fc08e',
          yConfig: [{ color: '#d36186', forAccessor: '32f66676-f4e1-48fd-b7f8-d4de38318601' }],
        },
        {
          accessors: ['b7e59b08-96e6-40d1-84fd-e97b977d1c47'],
          layerId: 'ec84ba70-2adb-4647-8ef0-8ad91a0e6d4e',
          layerType: 'data',
          seriesType: 'bar_horizontal_stacked',
          xAccessor: 'c72aad6a-fc9c-43dc-9194-e13ca3ee8aff',
          yConfig: [{ color: '#9170b8', forAccessor: 'b7e59b08-96e6-40d1-84fd-e97b977d1c47' }],
        },
      ],
      legend: { isVisible: false, position: 'right', showSingleSeries: false },
      preferredSeriesType: 'bar_horizontal_stacked',
      tickLabelsVisibilitySettings: { x: true, yLeft: true, yRight: true },
      valueLabels: 'hide',
      yLeftExtent: { mode: 'full' },
      yRightExtent: { mode: 'full' },
    },
  },
  title: '[Host] Unique IPs - bar',
  visualizationType: 'lnsXY',
  references: [
    {
      id: '{dataViewId}',
      name: 'indexpattern-datasource-current-indexpattern',
      type: 'index-pattern',
    },
    {
      id: '{dataViewId}',
      name: 'indexpattern-datasource-layer-8be0156b-d423-4a39-adf1-f54d4c9f2e69',
      type: 'index-pattern',
    },
    {
      id: '{dataViewId}',
      name: 'indexpattern-datasource-layer-ec84ba70-2adb-4647-8ef0-8ad91a0e6d4e',
      type: 'index-pattern',
    },
  ],
} as LensAttributes;
