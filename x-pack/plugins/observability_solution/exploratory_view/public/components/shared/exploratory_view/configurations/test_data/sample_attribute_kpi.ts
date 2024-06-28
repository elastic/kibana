/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { mockDataView } from '../../rtl_helpers';
import { RECORDS_FIELD } from '../constants';

export const sampleAttributeKpi = {
  description: '',
  references: [],
  state: {
    internalReferences: [
      {
        id: 'apm-*',
        name: 'indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: 'apm-*',
        name: 'indexpattern-datasource-layer-layer0',
        type: 'index-pattern',
      },
    ],
    adHocDataViews: { [mockDataView.title]: mockDataView.toSpec(false) },
    datasourceStates: {
      formBased: {
        layers: {
          layer0: {
            columnOrder: ['x-axis-column-layer0', 'y-axis-column-layer0-0'],
            columns: {
              'x-axis-column-layer0': {
                dataType: 'date',
                isBucketed: true,
                label: '@timestamp',
                operationType: 'date_histogram',
                params: {
                  interval: 'auto',
                  includeEmptyRows: true,
                },
                scale: 'interval',
                sourceField: '@timestamp',
              },
              'y-axis-column-layer0-0': {
                dataType: 'number',
                filter: {
                  language: 'kuery',
                  query: 'transaction.type: page-load and processor.event: transaction',
                },
                isBucketed: false,
                label: 'test-series',
                customLabel: true,
                operationType: 'count',
                scale: 'ratio',
                sourceField: RECORDS_FIELD,
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
      query: 'transaction.type: page-load and processor.event: transaction',
    },
    visualization: {
      axisTitlesVisibilitySettings: {
        x: false,
        yLeft: true,
        yRight: true,
      },
      curveType: 'CURVE_MONOTONE_X',
      fittingFunction: 'Linear',
      gridlinesVisibilitySettings: {
        x: false,
        yLeft: true,
        yRight: true,
      },
      layers: [
        {
          accessors: ['y-axis-column-layer0-0'],
          layerId: 'layer0',
          layerType: 'data',
          palette: undefined,
          seriesType: 'line',
          xAccessor: 'x-axis-column-layer0',
          yConfig: [
            {
              color: 'green',
              forAccessor: 'y-axis-column-layer0-0',
              axisMode: 'left',
            },
          ],
        },
      ],
      legend: {
        isVisible: true,
        showSingleSeries: true,
        position: 'right',
        legendSize: 'auto',
        shouldTruncate: false,
      },
      preferredSeriesType: 'line',
      tickLabelsVisibilitySettings: {
        x: true,
        yLeft: true,
        yRight: true,
      },
      valueLabels: 'hide',
    },
  },
  title: 'Prefilled from exploratory view app',
  visualizationType: 'lnsXY',
};
