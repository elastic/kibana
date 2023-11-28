/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const scaffoldingLensDoc = {
  title: 'Metric chart for comparison',
  description: '',
  visualizationType: 'lnsXY',
  type: 'lens',
  references: [],
  state: {
    visualization: {
      title: 'Empty XY chart',
      legend: {
        isVisible: false,
        position: 'right',
        showSingleSeries: false,
      },
      valueLabels: 'hide',
      preferredSeriesType: 'bar',
      layers: [],
      gridlinesVisibilitySettings: {
        x: true,
        yLeft: false,
        yRight: true,
      },
      tickLabelsVisibilitySettings: {
        x: true,
        yLeft: true,
        yRight: true,
      },
      yLeftExtent: {
        mode: 'full',
        niceValues: true,
      },
      hideEndzones: false,
      showCurrentTimeMarker: false,
      axisTitlesVisibilitySettings: {
        x: true,
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
      formBased: {
        layers: {},
      },
      indexpattern: {
        layers: {},
      },
      textBased: {
        layers: {},
      },
    },
    internalReferences: [],
    adHocDataViews: {},
  },
};
