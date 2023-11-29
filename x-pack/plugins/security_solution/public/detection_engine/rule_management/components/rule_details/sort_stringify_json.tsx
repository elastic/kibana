/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const sortObject = (jsObject) => {
  if (typeof jsObject !== 'object' || jsObject === null) {
    return jsObject;
  }

  if (Array.isArray(jsObject)) {
    return jsObject.map((item) => sortObject(item));
  }

  return Object.keys(jsObject)
    .sort()
    .reduce((sorted, key) => {
      sorted[key] = sortObject(jsObject[key]);
      return sorted;
    }, {});
};

export const sortAndStringifyJson = (jsObject: Record<string, unknown>): string =>
  JSON.stringify(sortObject(jsObject), null, 2);
