/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get as getProp } from 'lodash';
import { Ping } from '../../../../../common/runtime_types';

export function sortPings(pings: Ping[], sortField: string, sortDirection: 'asc' | 'desc') {
  const toSort = [...pings];
  toSort.sort((a, b) => {
    let propA = getProp(a, sortField) ?? null;
    let propB = getProp(b, sortField) ?? null;

    if (propA === null || propB === null) {
      return 0;
    }

    if (sortField === 'timestamp') {
      propA = new Date(propA);
      propB = new Date(propB);
    }

    if (sortField === 'monitor.status') {
      propA = propA === 'up' ? -1 : 1;
      propB = propB === 'up' ? -1 : 1;
    }

    if (typeof propA === 'string') {
      return sortDirection === 'asc' ? propA.localeCompare(propB) : propB.localeCompare(propA);
    }

    return sortDirection === 'asc' ? propA - propB : propB - propA;
  });

  return toSort;
}
