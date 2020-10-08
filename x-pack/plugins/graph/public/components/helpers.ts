/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function isEqual<T extends object>(a: T, b: T) {
  return (Object.keys(a) as Array<keyof T>).every((key) => a[key] === b[key]);
}
