/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

declare module 'idx2' {
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
  type DeepRequired<T> = T extends any[]
    ? DeepRequiredArray<T[number]>
    : T extends (...args: any[]) => any
    ? FunctionWithRequiredReturnType<T>
    : T extends object
    ? DeepRequiredObject<T>
    : T;

  function idx2<T1, T2>(
    prop: T1,
    accessor: (prop: DeepRequired<T1>) => T2
  ): T2 | undefined;
  export default idx2;
}
