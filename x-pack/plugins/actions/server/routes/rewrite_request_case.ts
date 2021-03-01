/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type AsApiContract<T> = {
  [K in keyof T as CamelToSnake<Extract<K, string>>]: T[K];
};

type CamelToSnake<T extends string> = string extends T
  ? string
  : T extends `${infer C0}${infer C1}${infer R}`
  ? `${C0 extends Uppercase<C0> ? '_' : ''}${Lowercase<C0>}${C1 extends Uppercase<C1>
      ? '_'
      : ''}${Lowercase<C1>}${CamelToSnake<R>}`
  : T extends `${infer C0}${infer R}`
  ? `${C0 extends Uppercase<C0> ? '_' : ''}${Lowercase<C0>}${CamelToSnake<R>}`
  : '';

export type RewriteRequestCase<T> = (requested: AsApiContract<T>) => T;
export type RewriteResponseCase<T> = (
  responded: T
) => T extends Array<infer I> ? Array<AsApiContract<I>> : AsApiContract<T>;
