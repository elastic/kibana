/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FilterMap, FilterName } from '../../../../common/types';
import { FILTER_ALLOW_LIST } from '../../../../common/constants';

export const parseFiltersMap = (filterMapString: string) => {
  const filterMap: FilterMap = {
    'observer.geo.name': [],
    'url.port': [],
    'monitor.type': [],
    tags: [],
  };
  if (!filterMapString) {
    return filterMap;
  }
  try {
    const parsed: any = JSON.parse(filterMapString);
    if (Array.isArray(parsed)) {
      const map = new Map<FilterName, string[]>(parsed);
      FILTER_ALLOW_LIST.forEach(({ fieldName }) => {
        filterMap[fieldName] = map.get(fieldName) ?? [];
      });
    } else if (typeof parsed === 'object') {
      FILTER_ALLOW_LIST.forEach(({ fieldName }) => {
        filterMap[fieldName] = parsed[fieldName] ?? [];
      });
    }
    return filterMap;
  } catch {
    throw new Error('Unable to parse invalid filter string');
  }
};
