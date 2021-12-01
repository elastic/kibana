/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export const sampleAttributeCoreWebVital = {
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
            columnOrder: [
              'x-axis-column-layer0',
              'y-axis-column-layer0',
              'y-axis-column-1',
              'y-axis-column-2',
            ],
            columns: {
              'x-axis-column-layer0': {
                dataType: 'string',
                isBucketed: true,
                label: 'Top values of Operating system',
                operationType: 'terms',
                params: {
                  missingBucket: false,
                  orderBy: {
                    columnId: 'y-axis-column-layer0',
                    type: 'column',
                  },
                  orderDirection: 'desc',
                  otherBucket: true,
                  size: 10,
                },
                scale: 'ordinal',
                sourceField: 'user_agent.os.name',
              },
              'y-axis-column-1': {
                dataType: 'number',
                filter: {
                  language: 'kuery',
                  query:
                    'transaction.marks.agent.largestContentfulPaint > 2500 and transaction.marks.agent.largestContentfulPaint < 4000',
                },
                isBucketed: false,
                label: 'Average',
                operationType: 'count',
                scale: 'ratio',
                sourceField: 'Records',
              },
              'y-axis-column-2': {
                dataType: 'number',
                filter: {
                  language: 'kuery',
                  query: 'transaction.marks.agent.largestContentfulPaint > 4000',
                },
                isBucketed: false,
                label: 'Poor',
                operationType: 'count',
                scale: 'ratio',
                sourceField: 'Records',
              },
              'y-axis-column-layer0': {
                dataType: 'number',
                filter: {
                  language: 'kuery',
                  query:
                    'transaction.type: page-load and processor.event: transaction and transaction.marks.agent.largestContentfulPaint < 2500',
                },
                isBucketed: false,
                label: 'Good',
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
      query: 'transaction.type: "page-load"',
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
          accessors: ['y-axis-column-layer0', 'y-axis-column-1', 'y-axis-column-2'],
          layerId: 'layer0',
          layerType: 'data',
          seriesType: 'bar_horizontal_percentage_stacked',
          xAccessor: 'x-axis-column-layer0',
          yConfig: [
            {
              color: '#209280',
              forAccessor: 'y-axis-column',
            },
            {
              color: '#d6bf57',
              forAccessor: 'y-axis-column-1',
            },
            {
              color: '#cc5642',
              forAccessor: 'y-axis-column-2',
            },
          ],
        },
      ],
      legend: {
        isVisible: true,
        showSingleSeries: true,
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
