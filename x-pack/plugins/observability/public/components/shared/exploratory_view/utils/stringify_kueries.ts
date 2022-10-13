/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UrlFilter } from '../types';

/**
 * Extract a map's keys to an array, then map those keys to a string per key.
 * The strings contain all of the values chosen for the given field (which is also the key value).
 * Reduce the list of query strings to a singular string, with AND operators between.
 */

const buildOrCondition = (values: string[]) => {
  if (values.length === 1) {
    return `${values.join(' or ')}`;
  }
  return `(${values.join(' or ')})`;
};

function addSlashes(str: string) {
  return (str + '').replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0');
}

export const urlFiltersToKueryString = (urlFilters: UrlFilter[]): string => {
  let kueryString = '';

  urlFilters.forEach(({ field, values, notValues, wildcards, notWildcards }) => {
    const valuesT = values?.map((val) => `"${addSlashes(val)}"`);
    const notValuesT = notValues?.map((val) => `"${addSlashes(val)}"`);
    const wildcardsT = wildcards?.map((val) => `*${val}*`);
    const notWildcardsT = notWildcards?.map((val) => `*${val}*`);

    if (valuesT && valuesT?.length > 0) {
      if (kueryString.length > 0) {
        kueryString += ' and ';
      }
      kueryString += `${field}: ${buildOrCondition(valuesT)}`;
    }

    if (notValuesT && notValuesT?.length > 0) {
      if (kueryString.length > 0) {
        kueryString += ' and ';
      }
      kueryString += `not (${field}: ${buildOrCondition(notValuesT)})`;
    }
    if (wildcardsT && wildcardsT?.length > 0) {
      if (kueryString.length > 0) {
        kueryString += ' and ';
      }
      kueryString += `(${field}: ${buildOrCondition(wildcardsT)})`;
    }
    if (notWildcardsT && notWildcardsT?.length > 0) {
      if (kueryString.length > 0) {
        kueryString += ' and ';
      }
      kueryString += `(${field}: ${buildOrCondition(notWildcardsT)})`;
    }
  });

  return kueryString;
};
