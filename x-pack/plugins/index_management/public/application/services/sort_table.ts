/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sortBy } from 'lodash';
import { Index } from '../../../common';
import type { ExtensionsService } from '../../services';

type SortField =
  | 'name'
  | 'status'
  | 'health'
  | 'primary'
  | 'replica'
  | 'documents'
  | 'size'
  | 'primary_size'
  | 'data_stream';

type Unit = 'kb' | 'mb' | 'gb' | 'tb' | 'pb';

const unitMagnitude = {
  kb: 1,
  mb: 2,
  gb: 3,
  tb: 4,
  pb: 5,
};

type SortFunction = (index: Index) => any;

const stringSort =
  (fieldName: SortField): SortFunction =>
  (item) => {
    return item[fieldName];
  };

const numericSort =
  (fieldName: SortField): SortFunction =>
  (item) =>
    +item[fieldName]!;

const byteSort =
  (fieldName: SortField): SortFunction =>
  (item) => {
    const rawValue = String(item[fieldName]);
    // raw value can be missing if index is closed
    if (!rawValue) {
      return 0;
    }
    const matchResult = rawValue.match(/(.*)([kmgtp]b)/);
    if (!matchResult) {
      return 0;
    }
    const [, number, unit] = matchResult;
    return +number * Math.pow(1024, unitMagnitude[unit as Unit]);
  };

const getSorters = (extensionsService?: ExtensionsService) => {
  const sorters = {
    name: stringSort('name'),
    status: stringSort('status'),
    health: stringSort('health'),
    primary: numericSort('primary'),
    replica: numericSort('replica'),
    documents: numericSort('documents'),
    size: byteSort('size'),
    primary_size: byteSort('primary_size'),
    data_stream: stringSort('data_stream'),
  } as any;
  const columns = extensionsService?.columns ?? [];
  for (const column of columns) {
    if (column.sort) {
      sorters[column.fieldName] = column.sort;
    }
  }
  return sorters;
};

export const sortTable = (
  array: Index[] = [],
  sortField: SortField | string,
  isSortAscending: boolean,
  extensionsService?: ExtensionsService
) => {
  const sorters = getSorters(extensionsService);
  const sorted = sortBy(array, sorters[sortField]);
  return isSortAscending ? sorted : sorted.reverse();
};
