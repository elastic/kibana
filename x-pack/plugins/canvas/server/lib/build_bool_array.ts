/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  CanvasQueryFilter,
  ElasticsarchTermFilter,
  ElasticsearchLuceneQueryStringFilter,
  ElasticsearchTimeFilter,
} from './filters';
import { getESFilter } from './get_es_filter';

type ElasticsearchFilter =
  | ElasticsarchTermFilter
  | ElasticsearchLuceneQueryStringFilter
  | ElasticsearchTimeFilter;

const compact = (arr: Array<ElasticsearchFilter | undefined>) =>
  Array.isArray(arr) ? arr.filter((val): val is ElasticsearchFilter => Boolean(val)) : [];

export function buildBoolArray(canvasQueryFilterArray: CanvasQueryFilter[]) {
  return compact(
    canvasQueryFilterArray.map(
      (clause: CanvasQueryFilter): ElasticsearchFilter | undefined => {
        try {
          return getESFilter(clause);
        } catch (e) {
          return;
        }
      }
    )
  );
}
