/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * This file was copied from
 * src/plugins/discover/public/application/apps/main/components/doc_table/lib/get_sort_for_search_source.ts
 */

import type { EsQuerySortValue, IndexPattern } from 'src/plugins/data/common';
import { getSort } from './get_sort';

export function getSortForSearchSource(
  sort?: Array<[string, string]>,
  indexPattern?: IndexPattern,
  defaultDirection: string = 'desc'
): EsQuerySortValue[] {
  if (!sort || !indexPattern || (Array.isArray(sort) && sort.length === 0)) {
    if (indexPattern?.timeFieldName) {
      // sorting by index order
      return [{ _doc: defaultDirection } as EsQuerySortValue];
    } else {
      return [{ _score: defaultDirection } as EsQuerySortValue];
    }
  }
  const { timeFieldName } = indexPattern;
  return getSort(sort, indexPattern).map((sortPair: Record<string, string>) => {
    if (indexPattern.isTimeNanosBased() && timeFieldName && sortPair[timeFieldName]) {
      return {
        [timeFieldName]: {
          order: sortPair[timeFieldName],
          numeric_type: 'date_nanos',
        },
      } as EsQuerySortValue;
    }
    return sortPair as EsQuerySortValue;
  });
}
