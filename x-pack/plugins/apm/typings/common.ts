/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface StringMap<T = unknown> {
  [key: string]: T;
}

// Allow unknown properties in an object
export type AllowUnknownProperties<Obj> = Obj extends object
  ? { [Prop in keyof Obj]: AllowUnknownProperties<Obj[Prop]> } & {
      [key: string]: unknown;
    }
  : Obj;

export type PromiseReturnType<Func> = Func extends (
  ...args: any[]
) => Promise<infer Value>
  ? Value
  : Func;
