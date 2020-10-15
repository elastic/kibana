/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const flatten = (source: any, path: any[] = []): { [key: string]: any } => {
  if (!(source instanceof Object)) {
    return {
      [path.join('.')]: source,
    };
  }

  return Object.keys(source).reduce((result, key) => {
    const flattened: any = flatten(source[key], [...path, key]);
    return {
      ...result,
      ...flattened,
    };
  }, {});
};
