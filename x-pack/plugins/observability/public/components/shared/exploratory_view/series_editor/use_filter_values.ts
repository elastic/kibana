/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ExistsFilter, isExistsFilter } from '@kbn/es-query';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ESFilter } from '@kbn/core/types/elasticsearch';
import { PersistableFilter } from '@kbn/lens-plugin/common';
import { useValuesList } from '../../../../hooks/use_values_list';
import { FilterProps } from './columns/filter_expanded';
import { useAppDataViewContext } from '../hooks/use_app_data_view';

export function useFilterValues(
  { field, series, baseFilters, label }: FilterProps,
  query?: string
) {
  const { dataViews } = useAppDataViewContext(series.dataType);

  const queryFilters: ESFilter[] = [];

  baseFilters?.forEach((qFilter: PersistableFilter | ExistsFilter) => {
    if (qFilter.query) {
      queryFilters.push(qFilter.query);
    }
    if (isExistsFilter(qFilter)) {
      queryFilters.push({ exists: qFilter.query.exists } as estypes.QueryDslQueryContainer);
    }
  });

  return useValuesList({
    query,
    label: label ?? field,
    sourceField: field,
    time: series.time,
    keepHistory: true,
    filters: queryFilters,
    dataViewTitle: dataViews[series.dataType]?.title,
  });
}
