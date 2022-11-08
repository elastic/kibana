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
    if (reportType && dataType && metricType) {
      trackEvent({
        app: 'observability-overview',
        metricType: METRIC_TYPE.COUNT,
        metric: `exploratory_view__report_type_${reportType}__data_type_${dataType}__metric_type_${metricType}`,
      });
    }
  });
};

export const trackChartLoadingTime = (trackEvent: TrackEvent, start: number, end: number) => {
  const secondsLoading = (end - start) / 1000;
  const rangeStr = toRangeStr(secondsLoading);

  if (rangeStr) {
    trackChartLoadingMetric(trackEvent, rangeStr);
  }
};

function toRangeStr(n: number) {
  if (n < 0 || isNaN(n)) return null;
  if (n >= 60) return '60+';
  else if (n >= 30) return '30-60';
  else if (n >= 20) return '20-30';
  else if (n >= 10) return '10-20';
  else if (n >= 5) return '5-10';
  return '0-5';
}

const trackChartLoadingMetric = (trackEvent: TrackEvent, range: string) => {
  trackEvent({
    app: 'observability-overview',
    metricType: METRIC_TYPE.COUNT,
    metric: `exploratory_view__chart_loading_in_seconds_${range}`,
  });
};
