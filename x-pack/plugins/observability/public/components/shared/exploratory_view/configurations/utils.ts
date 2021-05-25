/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import rison, { RisonValue } from 'rison-node';
import type { AllSeries, AllShortSeries } from '../hooks/use_url_storage';
import type { SeriesUrl } from '../types';
import { IIndexPattern } from '../../../../../../../../src/plugins/data/common/index_patterns';
import { esFilters } from '../../../../../../../../src/plugins/data/public';
import { URL_KEYS } from './constants/url_constants';

export function convertToShortUrl(series: SeriesUrl) {
  const {
    operationType,
    seriesType,
    reportType,
    breakdown,
    filters,
    reportDefinitions,
    dataType,
    ...restSeries
  } = series;

  return {
    [URL_KEYS.OPERATION_TYPE]: operationType,
    [URL_KEYS.REPORT_TYPE]: reportType,
    [URL_KEYS.SERIES_TYPE]: seriesType,
    [URL_KEYS.BREAK_DOWN]: breakdown,
    [URL_KEYS.FILTERS]: filters,
    [URL_KEYS.REPORT_DEFINITIONS]: reportDefinitions,
    [URL_KEYS.DATA_TYPE]: dataType,
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

export function buildPhraseFilter(field: string, value: string, indexPattern: IIndexPattern) {
  const fieldMeta = indexPattern.fields.find((fieldT) => fieldT.name === field);
  if (fieldMeta) {
    return [esFilters.buildPhraseFilter(fieldMeta, value, indexPattern)];
  }
  return [];
}

export function buildPhrasesFilter(field: string, value: string[], indexPattern: IIndexPattern) {
  const fieldMeta = indexPattern.fields.find((fieldT) => fieldT.name === field);
  if (fieldMeta) {
    return [esFilters.buildPhrasesFilter(fieldMeta, value, indexPattern)];
  }
  return [];
}

export function buildExistsFilter(field: string, indexPattern: IIndexPattern) {
  const fieldMeta = indexPattern.fields.find((fieldT) => fieldT.name === field);
  if (fieldMeta) {
    return [esFilters.buildExistsFilter(fieldMeta, indexPattern)];
  }
  return [];
}
