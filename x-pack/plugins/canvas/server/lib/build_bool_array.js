/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getESFilter } from './get_es_filter';

const compact = arr => (Array.isArray(arr) ? arr.filter(val => Boolean(val)) : []);

export function buildBoolArray(canvasQueryFilterArray) {
  return compact(
    canvasQueryFilterArray.map(clause => {
      try {
        return getESFilter(clause);
      } catch (e) {
        return;
      }
    })
  );
}
