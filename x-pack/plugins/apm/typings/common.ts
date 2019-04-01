/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface StringMap<T = unknown> {
  [key: string]: T;
}

// Allow unknown properties in an object
export type AllowUnknownProperties<T> = T extends object
  ? { [P in keyof T]: AllowUnknownProperties<T[P]> } & {
      [key: string]: unknown;
    }
  : T;

export type PromiseReturnType<T> = T extends (
  ...args: any[]
) => Promise<infer V>
  ? V
  : T;
