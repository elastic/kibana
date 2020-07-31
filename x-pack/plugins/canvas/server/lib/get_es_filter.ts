/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
  boolArray is the array of bool filter clauses to push filters into. Usually this would be
  the value of must, should or must_not.
  filter is the abstracted canvas filter.
*/

import { filters } from './filters';
import { ExpressionValueFilter } from '../../types';

export function getESFilter(filter: ExpressionValueFilter) {
  if (!filter.filterType || !filters[filter.filterType]) {
    throw new Error(`Unknown filter type: ${filter.filterType}`);
  }

  try {
    return filters[filter.filterType](filter);
  } catch (e) {
    throw new Error(`Could not create elasticsearch filter from ${filter.filterType}`);
  }
}
