/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export const sampleAttributeKpi = {
  description: 'undefined',
  references: [
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
  state: {
    datasourceStates: {
      indexpattern: {
        layers: {
          layer0: {
            columnOrder: ['x-axis-column-layer0', 'y-axis-column-layer0'],
            columns: {
              'x-axis-column-layer0': {
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
              'y-axis-column-layer0': {
                dataType: 'number',
                filter: {
                  language: 'kuery',
                  query: 'transaction.type: page-load and processor.event: transaction',
                },
                isBucketed: false,
                label: 'Page views',
                operationType: 'count',
                scale: 'ratio',
                sourceField: 'Records',
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
      query: '',
    },
    visualization: {
      axisTitlesVisibilitySettings: {
        x: true,
        yLeft: true,
        yRight: true,
      },
      curveType: 'CURVE_MONOTONE_X',
      fittingFunction: 'Linear',
      gridlinesVisibilitySettings: {
        x: true,
        yLeft: true,
        yRight: true,
      },
      layers: [
        {
          accessors: ['y-axis-column-layer0'],
          layerId: 'layer0',
          layerType: 'data',
          seriesType: 'line',
          xAccessor: 'x-axis-column-layer0',
          yConfig: [
            {
              color: 'green',
              forAccessor: 'y-axis-column-layer0',
            },
          ],
        },
      ],
      legend: {
        isVisible: true,
        position: 'right',
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
