/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { sortBy } from 'lodash';

type SortField =
  | 'name'
  | 'status'
  | 'health'
  | 'primary'
  | 'replica'
  | 'documents'
  | 'size'
  | 'primary_size';

type Unit = 'kb' | 'mb' | 'gb' | 'tb' | 'pb';

const unitMagnitude = {
  kb: 1,
  mb: 2,
  gb: 3,
  tb: 4,
  pb: 5,
};

const stringSort = (fieldName: SortField) => (item: { [key: string]: any }) => {
  return item[fieldName];
};

const numericSort = (fieldName: SortField) => (item: { [key: string]: any }) => +item[fieldName];

const byteSort = (fieldName: SortField) => (item: { [key: string]: any }) => {
  const rawValue = item[fieldName];
  // raw value can be missing if index is closed
  if (!rawValue) {
    return 0;
  }
  const matchResult = rawValue.match(/(.*)([kmgtp]b)/);
  if (!matchResult) {
    return 0;
  }
  const [, number, unit]: [string, string, Unit] = matchResult;
  return +number * Math.pow(1024, unitMagnitude[unit]);
};

const sorters = {
  name: stringSort('name'),
  status: stringSort('status'),
  health: stringSort('health'),
  primary: numericSort('primary'),
  replica: numericSort('replica'),
  documents: numericSort('documents'),
  size: byteSort('size'),
  primary_size: byteSort('primary_size'),
};

export const sortTable = (array = [], sortField: SortField, isSortAscending: boolean) => {
  const sorted = sortBy(array, sorters[sortField]);
  return isSortAscending ? sorted : sorted.reverse();
};
