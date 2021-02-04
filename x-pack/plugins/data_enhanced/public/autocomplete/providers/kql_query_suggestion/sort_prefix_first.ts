/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { partition } from 'lodash';

export function sortPrefixFirst(array: any[], prefix?: string | number, property?: string): any[] {
  if (!prefix) {
    return array;
  }
  const lowerCasePrefix = ('' + prefix).toLowerCase();

  const partitions = partition(array, (entry) => {
    const value = ('' + (property ? entry[property] : entry)).toLowerCase();

    return value.startsWith(lowerCasePrefix);
  });

  return [...partitions[0], ...partitions[1]];
}
