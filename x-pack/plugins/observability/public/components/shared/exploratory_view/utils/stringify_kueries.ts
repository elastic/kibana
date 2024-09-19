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
export const urlFiltersToKueryString = (urlFilters: UrlFilter[]): string => {
  let kueryString = '';
  urlFilters.forEach(({ field, values, notValues }) => {
    const valuesT = values?.map((val) => `"${val}"`);
    const notValuesT = notValues?.map((val) => `"${val}"`);

    if (valuesT && valuesT?.length > 0) {
      if (kueryString.length > 0) {
        kueryString += ' and ';
      }
      kueryString += `${field}: (${valuesT.join(' or ')})`;
    }

    if (notValuesT && notValuesT?.length > 0) {
      if (kueryString.length > 0) {
        kueryString += ' and ';
      }
      kueryString += `not (${field}: (${notValuesT.join(' or ')}))`;
    }
  });

  return kueryString;
};
