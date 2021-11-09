/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import rison, { RisonValue } from 'rison-node';
import type { ReportViewType, SeriesUrl, UrlFilter } from '../types';
import type { AllSeries, AllShortSeries } from '../hooks/use_series_storage';
import { IndexPattern } from '../../../../../../../../src/plugins/data/common';
import { esFilters, ExistsFilter } from '../../../../../../../../src/plugins/data/public';
import { URL_KEYS } from './constants/url_constants';
import { PersistableFilter } from '../../../../../../lens/common';

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
    [URL_KEYS.COLOR]: color,
    ...restSeries,
  };
}

export function createExploratoryViewUrl(
  { reportType, allSeries }: { reportType: ReportViewType; allSeries: AllSeries },
  baseHref = ''
) {
  const allShortSeries: AllShortSeries = allSeries.map((series) => convertToShortUrl(series));

  return (
    baseHref +
    `/app/observability/exploratory-view/#?reportType=${reportType}&sr=${rison.encode(
      allShortSeries as unknown as RisonValue
    )}`
  );
}

export function buildPhraseFilter(field: string, value: string, indexPattern: IndexPattern) {
  const fieldMeta = indexPattern?.fields.find((fieldT) => fieldT.name === field);
  if (fieldMeta) {
    return [esFilters.buildPhraseFilter(fieldMeta, value, indexPattern)];
  }
  return [];
}

export function buildPhrasesFilter(field: string, value: string[], indexPattern: IndexPattern) {
  const fieldMeta = indexPattern?.fields.find((fieldT) => fieldT.name === field);
  if (fieldMeta) {
    return [esFilters.buildPhrasesFilter(fieldMeta, value, indexPattern)];
  }
  return [];
}

export function buildExistsFilter(field: string, indexPattern: IndexPattern) {
  const fieldMeta = indexPattern?.fields.find((fieldT) => fieldT.name === field);
  if (fieldMeta) {
    return [esFilters.buildExistsFilter(fieldMeta, indexPattern)];
  }
  return [];
}

type FiltersType = PersistableFilter[] | ExistsFilter[];

export function urlFilterToPersistedFilter({
  urlFilters,
  initFilters,
  indexPattern,
}: {
  urlFilters: UrlFilter[];
  initFilters: FiltersType;
  indexPattern: IndexPattern;
}) {
  const parsedFilters: FiltersType = initFilters ? [...initFilters] : [];

  urlFilters.forEach(({ field, values = [], notValues = [] }) => {
    if (values?.length > 0) {
      const filter = buildPhrasesFilter(field, values, indexPattern);
      parsedFilters.push(...filter);
    }

    if (notValues?.length > 0) {
      const filter = buildPhrasesFilter(field, notValues, indexPattern)[0];
      filter.meta.negate = true;
      parsedFilters.push(filter);
    }
  });

  return parsedFilters;
}
