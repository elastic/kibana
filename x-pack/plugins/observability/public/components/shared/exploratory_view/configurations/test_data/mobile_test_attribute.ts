/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const testMobileKPIAttr = {
  title: 'Prefilled from exploratory view app',
  description: '',
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
  visualizationType: 'lnsXY',
  state: {
    datasourceStates: {
      indexpattern: {
        layers: {
          layer0: {
            columnOrder: ['x-axis-column-layer0', 'y-axis-column-layer0'],
            columns: {
              'x-axis-column-layer0': {
                sourceField: '@timestamp',
                dataType: 'date',
                isBucketed: true,
                label: '@timestamp',
                operationType: 'date_histogram',
                params: { interval: 'auto' },
                scale: 'interval',
              },
              'y-axis-column-layer0': {
                isBucketed: false,
                label: 'Median of System memory usage',
                operationType: 'median',
                scale: 'ratio',
                sourceField: 'system.memory.usage',
                dataType: 'number',
                filter: {
                  query:
                    'service.name: "ios-integration-testing" and agent.name: (iOS/swift or open-telemetry/swift) and processor.event: metric',
                  language: 'kuery',
                },
              },
            },
            incompleteColumns: {},
          },
        },
      },
    },
    visualization: {
      legend: { isVisible: true, showSingleSeries: true, position: 'right' },
      valueLabels: 'hide',
      fittingFunction: 'Linear',
      curveType: 'CURVE_MONOTONE_X',
      axisTitlesVisibilitySettings: { x: true, yLeft: true, yRight: true },
      tickLabelsVisibilitySettings: { x: true, yLeft: true, yRight: true },
      gridlinesVisibilitySettings: { x: true, yLeft: true, yRight: true },
      preferredSeriesType: 'line',
      layers: [
        {
          accessors: ['y-axis-column-layer0'],
          layerId: 'layer0',
          layerType: 'data',
          seriesType: 'line',
          yConfig: [{ forAccessor: 'y-axis-column-layer0', color: 'green', axisMode: 'left' }],
          xAccessor: 'x-axis-column-layer0',
        },
      ],
    },
    query: {
      query:
        'service.name: "ios-integration-testing" and agent.name: (iOS/swift or open-telemetry/swift)',
      language: 'kuery',
    },
    filters: [],
  },
};
