/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compact, isObject } from 'lodash';

// Inspired by x-pack/plugins/observability_solution/apm/public/utils/flatten_object.ts
// Slighly modified to have key/value exposed as Object.
export const flattenObject = (
  item: Record<any, any | any[]> | null | undefined,
  accDefault: Record<string, any> = {},
  parentKey?: string
): Record<string, any> => {
  if (item) {
    const isArrayWithSingleValue = Array.isArray(item) && item.length === 1;
    return Object.keys(item)
      .sort()
      .reduce<Record<string, any>>((acc, key) => {
        const childKey = isArrayWithSingleValue ? '' : key;
        const currentKey = compact([parentKey, childKey]).join('.');
        // item[key] can be a primitive (string, number, boolean, null, undefined) or Object or Array
        if (isObject(item[key])) {
          flattenObject(item[key], acc, currentKey);
        } else {
          acc[currentKey] = item[key];
        }

        return acc;
      }, accDefault);
  }
  return {};
};
