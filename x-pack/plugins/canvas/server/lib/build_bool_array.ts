/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GenericFilter } from './filters';
import { getESFilter } from './get_es_filter';

const compact = (arr: Array<GenericFilter | undefined>) =>
  Array.isArray(arr) ? arr.filter((val): val is GenericFilter => Boolean(val)) : [];

export function buildBoolArray(canvasQueryFilterArray: GenericFilter[]) {
  return compact(
    canvasQueryFilterArray.map((clause: GenericFilter) => {
      try {
        return getESFilter(clause);
      } catch (e) {
        return;
      }
    })
  );
}
