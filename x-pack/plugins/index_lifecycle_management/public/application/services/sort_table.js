/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { sortBy } from 'lodash';

const stringSort = (fieldName) => (item) => item[fieldName];
const arraySort = (fieldName) => (item) => (item[fieldName] || []).length;

const sorters = {
  version: stringSort('version'),
  name: stringSort('name'),
  linkedIndices: arraySort('linkedIndices'),
  modified_date: stringSort('modified_date'),
};
export const sortTable = (array = [], sortField, isSortAscending) => {
  const sorted = sortBy(array, sorters[sortField]);
  return isSortAscending ? sorted : sorted.reverse();
};
