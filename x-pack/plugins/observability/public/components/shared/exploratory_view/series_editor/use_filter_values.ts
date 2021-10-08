/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ExistsFilter, isExistsFilter } from '@kbn/es-query';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/api/types';
import { useValuesList } from '../../../../hooks/use_values_list';
import { FilterProps } from './columns/filter_expanded';
import { useAppIndexPatternContext } from '../hooks/use_app_index_pattern';
import { ESFilter } from '../../../../../../../../src/core/types/elasticsearch';
import { PersistableFilter } from '../../../../../../lens/common';

export function useFilterValues({ field, series, baseFilters }: FilterProps, query: string) {
  const { indexPatterns } = useAppIndexPatternContext(series.dataType);

  const queryFilters: ESFilter[] = [];

  baseFilters?.forEach((qFilter: PersistableFilter | ExistsFilter) => {
    if (qFilter.query) {
      queryFilters.push(qFilter.query);
    }
    if (isExistsFilter(qFilter)) {
      queryFilters.push({ exists: qFilter.query.exists } as QueryDslQueryContainer);
    }
  });

  return useValuesList({
    query,
    sourceField: field,
    time: series.time,
    keepHistory: true,
    filters: queryFilters,
    indexPatternTitle: indexPatterns[series.dataType]?.title,
  });
}
