/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * This file was copied from src/plugins/discover/public/application/apps/main/components/doc_table/lib/get_sort.ts
 */

import { isPlainObject } from 'lodash';
import type { IndexPattern } from 'src/plugins/data/common';

type SortPairObj = Record<string, string>;
type SortPairArr = [string, string];
type SortPair = SortPairArr | SortPairObj;
type SortInput = SortPair | SortPair[];

function isSortable(fieldName: string, indexPattern: IndexPattern): boolean {
  const field = indexPattern.getFieldByName(fieldName);
  return !!(field && field.sortable);
}

function isLegacySort(sort: SortPair[] | SortPair): sort is SortPair {
  return (
    sort.length === 2 && typeof sort[0] === 'string' && (sort[1] === 'desc' || sort[1] === 'asc')
  );
}

function createSortObject(
  sortPair: SortInput,
  indexPattern: IndexPattern
): SortPairObj | undefined {
  if (
    Array.isArray(sortPair) &&
    sortPair.length === 2 &&
    isSortable(String(sortPair[0]), indexPattern)
  ) {
    const [field, direction] = sortPair as SortPairArr;
    return { [field]: direction };
  } else if (isPlainObject(sortPair) && isSortable(Object.keys(sortPair)[0], indexPattern)) {
    return sortPair as SortPairObj;
  }
}

/**
 * Take a sorting array and make it into an object
 * @param {array} sort two dimensional array [[fieldToSort, directionToSort]]
 *  or an array of objects [{fieldToSort: directionToSort}]
 * @param {object} indexPattern used for determining default sort
 * @returns Array<{object}> an array of sort objects
 */
export function getSort(sort: SortPair[] | SortPair, indexPattern: IndexPattern): SortPairObj[] {
  if (Array.isArray(sort)) {
    if (isLegacySort(sort)) {
      // To stay compatible with legacy sort, which just supported a single sort field
      return [{ [sort[0]]: sort[1] }];
    }
    return sort
      .map((sortPair: SortPair) => createSortObject(sortPair, indexPattern))
      .filter((sortPairObj) => typeof sortPairObj === 'object') as SortPairObj[];
  }
  return [];
}
