/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import rison, { RisonValue } from 'rison-node';
import type { AllSeries, AllShortSeries } from '../hooks/use_url_strorage';
import type { SeriesUrl } from '../types';
import { IIndexPattern } from '../../../../../../../../src/plugins/data/common/index_patterns';
import { esFilters } from '../../../../../../../../src/plugins/data/public';

const METRIC_TYPE = 'mt';
const REPORT_TYPE = 'rt';
const SERIES_TYPE = 'st';
const BREAK_DOWN = 'bd';
const FILTERS = 'ft';
const REPORT_DEFINITIONS = 'rdf';

export function convertToShortUrl(series: SeriesUrl) {
  const {
    metric,
    seriesType,
    reportType,
    breakdown,
    filters,
    reportDefinitions,
    ...restSeries
  } = series;

  return {
    [METRIC_TYPE]: metric,
    [REPORT_TYPE]: reportType,
    [SERIES_TYPE]: seriesType,
    [BREAK_DOWN]: breakdown,
    [FILTERS]: filters,
    [REPORT_DEFINITIONS]: reportDefinitions,
    ...restSeries,
  };
}

export function createExploratoryViewUrl(allSeries: AllSeries, baseHref = '') {
  const allSeriesIds = Object.keys(allSeries);

  const allShortSeries: AllShortSeries = {};

  allSeriesIds.forEach((seriesKey) => {
    allShortSeries[seriesKey] = convertToShortUrl(allSeries[seriesKey]);
  });

  return (
    baseHref +
    `/app/observability/exploratory-view#?sr=${rison.encode(allShortSeries as RisonValue)}`
  );
}

export function buildPhraseFilter(field: string, value: any, indexPattern: IIndexPattern) {
  const fieldMeta = indexPattern.fields.find((fieldT) => fieldT.name === field)!;
  return esFilters.buildPhraseFilter(fieldMeta, value, indexPattern);
}
