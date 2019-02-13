/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Filter } from './filters';
import { getESFilter } from './get_es_filter';

const compact = (arr: boolean[]) => (Array.isArray(arr) ? arr.filter(val => Boolean(val)) : []);

export function buildBoolArray(canvasQueryFilterArray: Filter[]) {
  return compact(
    canvasQueryFilterArray.map((clause: Filter) => {
      try {
        return getESFilter(clause);
      } catch (e) {
        return;
      }
    })
  );
}
