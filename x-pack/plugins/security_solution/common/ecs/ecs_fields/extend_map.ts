/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const extendMap = (
  path: string,
  map: Readonly<Record<string, string>>
): Readonly<Record<string, string>> =>
  Object.entries(map).reduce<Record<string, string>>((accum, [key, value]) => {
    accum[`${path}.${key}`] = `${path}.${value}`;
    return accum;
  }, {});
