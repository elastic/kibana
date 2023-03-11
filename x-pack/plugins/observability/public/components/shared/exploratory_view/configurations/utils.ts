/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import rison from '@kbn/rison';
import {
  buildQueryFilter,
  PhraseFilter,
  ExistsFilter,
  buildPhraseFilter as esBuildPhraseFilter,
  buildPhrasesFilter as esBuildPhrasesFilter,
  buildExistsFilter as esBuildExistsFilter,
} from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/common';
import { PersistableFilter } from '@kbn/lens-plugin/common';
import type { ReportViewType, UrlFilter } from '../types';
import type { AllSeries, AllShortSeries } from '../hooks/use_series_storage';
import { convertToShortUrl, encodeUriIfNeeded } from './exploratory_view_url';

export function createExploratoryViewRoutePath({
  reportType,
  allSeries,
}: {
  reportType: ReportViewType;
  allSeries: AllSeries;
}) {
  const allShortSeries: AllShortSeries = allSeries.map((series) => convertToShortUrl(series));

  return `/exploratory-view/#?reportType=${reportType}&sr=${encodeUriIfNeeded(
    rison.encode(allShortSeries)
  )}`;
}

export function buildPhraseFilter(field: string, value: string, dataView?: DataView) {
  const fieldMeta = dataView?.fields.find((fieldT) => fieldT.name === field);
  if (fieldMeta && dataView) {
    return [esBuildPhraseFilter(fieldMeta, value, dataView)];
  }
  return [];
}

export function getQueryFilter(field: string, value: string[], dataView?: DataView) {
  const fieldMeta = dataView?.fields.find((fieldT) => fieldT.name === field);
  if (fieldMeta && dataView) {
    return value.map((val) =>
      buildQueryFilter(
        {
          query_string: {
            fields: [field],
            query: `*${val}*`,
          },
        },
        dataView.id!,
        ''
      )
    );
  }

  return [];
}

export function buildPhrasesFilter(
  field: string,
  value: Array<string | number>,
  dataView?: DataView
) {
  const fieldMeta = dataView?.fields.find((fieldT) => fieldT.name === field);
  if (fieldMeta && dataView) {
    if (value.length === 1) {
      return [esBuildPhraseFilter(fieldMeta, value[0], dataView)];
    }
    return [esBuildPhrasesFilter(fieldMeta, value, dataView)];
  }
  return [];
}

export function buildExistsFilter(field: string, dataView?: DataView) {
  const fieldMeta = dataView?.fields.find((fieldT) => fieldT.name === field);
  if (fieldMeta && dataView) {
    return [esBuildExistsFilter(fieldMeta, dataView)];
  }
  return [];
}

type FiltersType = Array<PersistableFilter | ExistsFilter | PhraseFilter>;

export function urlFilterToPersistedFilter({
  urlFilters,
  initFilters,
  dataView,
}: {
  urlFilters: UrlFilter[];
  initFilters?: FiltersType;
  dataView: DataView;
}) {
  const parsedFilters: FiltersType = initFilters ? [...initFilters] : [];

  urlFilters.forEach(
    ({ field, values = [], notValues = [], wildcards = [], notWildcards = ([] = []) }) => {
      if (values.length > 0) {
        const filter = buildPhrasesFilter(field, values, dataView);
        parsedFilters.push(...filter);
      }

      if (notValues.length > 0) {
        const filter = buildPhrasesFilter(field, notValues, dataView)[0];
        filter.meta.negate = true;
        parsedFilters.push(filter);
      }

      if (wildcards.length > 0) {
        const filter = getQueryFilter(field, wildcards, dataView);
        parsedFilters.push(...filter);
      }

      if (notWildcards.length > 0) {
        const filter = getQueryFilter(field, notWildcards, dataView)[0];
        filter.meta.negate = true;
        parsedFilters.push(filter);
      }
    }
  );

  return parsedFilters;
}
