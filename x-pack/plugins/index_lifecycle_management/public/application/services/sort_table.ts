/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { sortBy } from 'lodash';
import { PolicyFromES } from '../../../common/types';

export const sortTable = (
  array: PolicyFromES[] = [],
  sortField: Extract<keyof PolicyFromES, 'version' | 'name' | 'linkedIndices' | 'modified_date'>,
  isSortAscending: boolean
): PolicyFromES[] => {
  let sorter;
  if (sortField === 'linkedIndices') {
    sorter = (item: PolicyFromES) => (item[sortField] || []).length;
  } else {
    sorter = (item: PolicyFromES) => item[sortField];
  }
  const sorted = sortBy(array, sorter);
  return isSortAscending ? sorted : sorted.reverse();
};
