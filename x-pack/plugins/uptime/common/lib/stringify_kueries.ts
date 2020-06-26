/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FilterMap, FilterName } from '../types';
import { FILTER_ALLOW_LIST } from '../constants';

const fieldAllowList: FilterName[] = FILTER_ALLOW_LIST.map((filter) => filter.fieldName);

/**
 * Extract a map's keys to an array, then map those keys to a string per key.
 * The strings contain all of the values chosen for the given field (which is also the key value).
 * Reduce the list of query strings to a singular string, with AND operators between.
 */
export const stringifyKueries = (kueries: FilterMap): string =>
  Object.keys(kueries)
    .filter((key) => fieldAllowList.indexOf(key as FilterName) !== -1)
    .map((key: string) => {
      const value: string[] = kueries[key as FilterName];
      if (!value || value.length === 0) return '';
      return value.reduce((prev: string, cur: string | number, index: number, array: string[]) => {
        if (cur === '') return prev;
        let expression: string = `${key}:${cur}`;
        if (typeof cur !== 'number' && (cur.indexOf(' ') >= 0 || cur.indexOf(':') >= 0)) {
          expression = `${key}:"${cur}"`;
        }
        if (array.length === 1) {
          return expression;
        } else if (array.length > 1 && index === 0) {
          return `(${expression}`;
        } else if (index + 1 === array.length) {
          return `${prev} or ${expression})`;
        }
        return `${prev} or ${expression}`;
      }, '');
    })
    .reduce((prev, cur, index, array) => {
      if (array.length === 1 || index === 0) {
        return cur;
      } else if (cur === '') {
        return prev;
      } else if (prev === '' && !!cur) {
        return cur;
      }
      return `${prev} and ${cur}`;
    }, '');
