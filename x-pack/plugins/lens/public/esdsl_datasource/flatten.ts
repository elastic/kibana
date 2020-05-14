/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

export function flatten(obj: any, keyPrefix = '') {
  let topLevelKeys: any = {};
  const nestedRows: any = [];
  Object.keys(obj).forEach(key => {
    if (Array.isArray(obj[key])) {
      nestedRows.push(
        ...obj[key]
          .map((nestedRow: any) => flatten(nestedRow, keyPrefix + '.' + key))
          .reduce((acc: any, obj2: any) => [...acc, ...obj2], [])
      );
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      const subRows = flatten(obj[key], keyPrefix + '.' + key);
      if (subRows.length === 1) {
        topLevelKeys = { ...topLevelKeys, ...subRows[0] };
      } else {
        nestedRows.push(...subRows);
      }
    } else {
      topLevelKeys[keyPrefix + '.' + key] = obj[key];
    }
  });
  if (nestedRows.length === 0) {
    return [topLevelKeys];
  } else {
    return nestedRows.map((nestedRow: any) => ({ ...nestedRow, ...topLevelKeys }));
  }
}
