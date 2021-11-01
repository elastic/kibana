/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TrackEvent, METRIC_TYPE } from '../../../../hooks/use_track_metric';
import type { SeriesUrl } from '../types';

export const trackTelemetryOnApply = (
  trackEvent: TrackEvent,
  allSeries: SeriesUrl[],
  reportType: string
) => {
  trackFilters(trackEvent, allSeries, reportType);
  trackDataType(trackEvent, allSeries, reportType);
  trackApplyChanges(trackEvent);
};

export const trackTelemetryOnLoad = (trackEvent: TrackEvent, start: number, end: number) => {
  trackChartLoadingTime(trackEvent, start, end);
};

const getAppliedFilters = (allSeries: SeriesUrl[]) => {
  const filtersByDataType = new Map<string, string[]>();
  allSeries.forEach((series) => {
    const seriesFilters = filtersByDataType.get(series.dataType);
    const filterFields = (series.filters || []).map((filter) => filter.field);

    if (seriesFilters) {
      seriesFilters.push(...filterFields);
    } else {
      filtersByDataType.set(series.dataType, [...filterFields]);
    }
  });
  return filtersByDataType;
};

const trackFilters = (trackEvent: TrackEvent, allSeries: SeriesUrl[], reportType: string) => {
  const filtersByDataType = getAppliedFilters(allSeries);
  [...filtersByDataType.keys()].forEach((dataType) => {
    const filtersForDataType = filtersByDataType.get(dataType);

    (filtersForDataType || []).forEach((filter) => {
      trackEvent({
        app: 'observability-overview',
        metricType: METRIC_TYPE.COUNT,
        metric: `exploratory_view__filters__filter_${filter}`,
      });
      trackEvent({
        app: 'observability-overview',
        metricType: METRIC_TYPE.COUNT,
        metric: `exploratory_view__filters__report_type_${reportType}__data_type_${dataType}__filter_${filter}`,
      });
    });
  });
};

const trackApplyChanges = (trackEvent: TrackEvent) => {
  trackEvent({
    app: 'observability-overview',
    metricType: METRIC_TYPE.COUNT,
    metric: 'exploratory_view_apply_changes',
  });
};

const trackDataType = (trackEvent: TrackEvent, allSeries: SeriesUrl[], reportType: string) => {
  const metrics = allSeries.map((series) => ({
    dataType: series.dataType,
    metricType: series.selectedMetricField,
  }));

  metrics.forEach(({ dataType, metricType }) => {
    trackEvent({
      app: 'observability-overview',
      metricType: METRIC_TYPE.COUNT,
      metric: `exploratory_view__report_type_${reportType}__data_type_${dataType}__metric_type_${metricType}`,
    });
  });
};

export const trackChartLoadingTime = (trackEvent: TrackEvent, start: number, end: number) => {
  const secondsLoading = (end - start) / 1000;
  switch (true) {
    case secondsLoading >= 60:
      trackChartLoadingMetric(trackEvent, '60+');
      break;
    case secondsLoading >= 30:
      trackChartLoadingMetric(trackEvent, '30-60');
      break;
    case secondsLoading >= 20:
      trackChartLoadingMetric(trackEvent, '20-30');
      break;
    case secondsLoading >= 10:
      trackChartLoadingMetric(trackEvent, '10-20');
      break;
    case secondsLoading >= 5:
      trackChartLoadingMetric(trackEvent, '5-10');
      break;
    case secondsLoading >= 0:
      trackChartLoadingMetric(trackEvent, '0-5');
      break;
  }
};

const trackChartLoadingMetric = (trackEvent: TrackEvent, range: string) => {
  trackEvent({
    app: 'observability-overview',
    metricType: METRIC_TYPE.COUNT,
    metric: `exploratory_view__chart_loading_in_seconds_${range}`,
  });
};
