/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExactlyFilter, LuceneQueryStringFilter, TimeFilter } from './filters';
import { getESFilter } from './get_es_filter';

const compact = (arr: boolean[]) => (Array.isArray(arr) ? arr.filter(val => Boolean(val)) : []);

export function buildBoolArray(canvasQueryFilterArray: any[]) {
  return compact(
    canvasQueryFilterArray.map((clause: TimeFilter | ExactlyFilter | LuceneQueryStringFilter) => {
      try {
        return getESFilter(clause);
      } catch (e) {
        return;
      }
    })
  );
}
