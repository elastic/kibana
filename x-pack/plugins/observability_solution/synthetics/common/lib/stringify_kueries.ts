/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Extract a map's keys to an array, then map those keys to a string per key.
 * The strings contain all of the values chosen for the given field (which is also the key value).
 * Reduce the list of query strings to a singular string, with AND operators between.
 */

export const stringifyKueries = (
  kueries: Map<string, Array<number | string>>,
  logicalANDForTag?: boolean
): string => {
  const defaultCondition = 'OR';

  return Array.from(kueries.keys())
    .map((key) => {
      let condition = defaultCondition;
      if (key === 'tags' && logicalANDForTag) {
        condition = 'AND';
      }
      const value = kueries.get(key)?.filter((v) => v !== '');
      if (!value || value.length === 0) return '';

      if (value.length === 1) {
        return isAlphaNumeric(value[0] as string) ? `${key}: ${value[0]}` : `${key}: "${value[0]}"`;
      }

      const values = value
        .map((v) => (isAlphaNumeric(v as string) ? v : `"${v}"`))
        .join(` ${condition} `);

      return `${key}: (${values})`;
    })
    .reduce((prev, cur, index, array) => {
      if (array.length === 1 || index === 0) {
        return cur;
      } else if (cur === '') {
        return prev;
      } else if (prev === '' && !!cur) {
        return cur;
      }
      return `${prev} AND ${cur}`;
    }, '');
};

const isAlphaNumeric = (str: string) => {
  const format = /[ `!@#$%^&*()_+=\[\]{};':"\\|,.<>\/?~]/;
  return !format.test(str);
};
