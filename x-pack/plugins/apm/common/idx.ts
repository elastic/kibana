/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * DeepRequiredArray
 * Nested array condition handler
 */
interface DeepRequiredArray<T> extends Array<DeepRequired<T>> {}

/**
 * DeepRequiredObject
 * Nested object condition handler
 */
type DeepRequiredObject<T> = { [P in keyof T]-?: DeepRequired<T[P]> };

/**
 * Function that has deeply required return type
 */
type FunctionWithRequiredReturnType<
  T extends (...args: any[]) => any
> = T extends (...args: infer A) => infer R
  ? (...args: A) => DeepRequired<R>
  : never;

/**
 * DeepRequired
 * Required that works for deeply nested structure
 */
type DeepRequired<T> = NonNullable<T> extends never
  ? T
  : T extends any[]
  ? DeepRequiredArray<T[number]>
  : T extends (...args: any[]) => any
  ? FunctionWithRequiredReturnType<T>
  : NonNullable<T> extends object
  ? DeepRequiredObject<NonNullable<T>>
  : T;

export function idx<T1, T2>(
  input: T1,
  accessor: (input: NonNullable<DeepRequired<T1>>) => T2
): T2 | undefined {
  try {
    return accessor(input as NonNullable<DeepRequired<T1>>);
  } catch (error) {
    return undefined;
  }
}
