/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import rison, { RisonValue } from 'rison-node';
import { URL_KEYS } from './constants/url_constants';
import type { ReportViewType, SeriesUrl } from '../types';
import type { AllSeries } from '../../../..';
import type { AllShortSeries } from '../hooks/use_series_storage';

export function convertToShortUrl(series: SeriesUrl) {
  const {
    operationType,
    seriesType,
    breakdown,
    filters,
    reportDefinitions,
    dataType,
    selectedMetricField,
    hidden,
    name,
    color,
    ...restSeries
  } = series;

  return {
    [URL_KEYS.OPERATION_TYPE]: operationType,
    [URL_KEYS.SERIES_TYPE]: seriesType,
    [URL_KEYS.BREAK_DOWN]: breakdown,
    [URL_KEYS.FILTERS]: filters,
    [URL_KEYS.REPORT_DEFINITIONS]: reportDefinitions,
    [URL_KEYS.DATA_TYPE]: dataType,
    [URL_KEYS.SELECTED_METRIC]: selectedMetricField,
    [URL_KEYS.HIDDEN]: hidden,
    [URL_KEYS.NAME]: name,
    [URL_KEYS.COLOR]: color ? escape(color) : undefined,
    ...restSeries,
  };
}

export function createExploratoryViewUrl(
  { reportType, allSeries }: { reportType: ReportViewType; allSeries: AllSeries },
  baseHref = '',
  appId = 'observability'
) {
  const allShortSeries: AllShortSeries = allSeries.map((series) => convertToShortUrl(series));

  return (
    baseHref +
    `/app/${appId}/exploratory-view/#?reportType=${reportType}&sr=${encodeUriIfNeeded(
      rison.encode(allShortSeries as unknown as RisonValue)
    )}`
  );
}

/**
 * Encodes the uri if it contains characters (`/?@&=+#`).
 * It doesn't consider `,` and `:` as they are part of [Rison]{@link https://www.npmjs.com/package/rison-node} syntax.
 *
 * @param uri Non encoded URI
 */
export function encodeUriIfNeeded(uri: string) {
  if (!uri) {
    return uri;
  }

  if (/[\/?@&=+#]/.test(uri)) {
    return encodeURIComponent(uri);
  }

  return uri;
}
