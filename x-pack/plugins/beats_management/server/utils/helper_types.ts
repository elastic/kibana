/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export type InterfaceExcept<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

export function arrayFromEnum<T extends string | number>(e: any): T[] {
  return Object.keys(e)
    .filter(key => isNaN(+key))
    .map(name => e[name]) as T[];
}
