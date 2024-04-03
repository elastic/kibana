/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function getTimeseriesexplorerDefaultState() {
  return {
    chartDetails: undefined,
    contextAggregationInterval: undefined,
    contextChartData: undefined,
    contextForecastData: undefined,
    // Not chartable if e.g. model plot with terms for a varp detector
    dataNotChartable: false,
    entitiesLoading: false,
    entityValues: {},
    focusAnnotationData: [],
    focusAggregationInterval: {},
    focusChartData: undefined,
    focusForecastData: undefined,
    fullRefresh: true,
    hasResults: false,
    // Counter to keep track of what data sets have been loaded.
    loadCounter: 0,
    loading: false,
    modelPlotEnabled: false,
    // Toggles display of annotations in the focus chart
    showAnnotations: true,
    showAnnotationsCheckbox: true,
    // Toggles display of forecast data in the focus chart
    showForecast: true,
    showForecastCheckbox: false,
    // Toggles display of model bounds in the focus chart
    showModelBounds: true,
    showModelBoundsCheckbox: false,
    svgWidth: 0,
    tableData: undefined,
    zoomFrom: undefined,
    zoomTo: undefined,
    zoomFromFocusLoaded: undefined,
    zoomToFocusLoaded: undefined,
    chartDataError: undefined,
    sourceIndicesWithGeoFields: {},
  };
}
