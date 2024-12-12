/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as runtimeTypes from 'io-ts';
import type { ReactNode } from 'react';

// This type is for typing EuiDescriptionList
export interface DescriptionList {
  title: NonNullable<ReactNode>;
  description: NonNullable<ReactNode>;
}

// Recursive partial object type. inspired by EUI
export type RecursivePartial<T> = {
  [P in keyof T]?: T[P] extends NonAny[]
    ? T[P]
    : T[P] extends readonly NonAny[]
    ? T[P]
    : T[P] extends Array<infer U>
    ? Array<RecursivePartial<U>>
    : T[P] extends ReadonlyArray<infer U>
    ? ReadonlyArray<RecursivePartial<U>>
    : T[P] extends Set<infer V>
    ? Set<RecursivePartial<V>>
    : T[P] extends Map<infer K, infer V>
    ? Map<K, RecursivePartial<V>>
    : T[P] extends NonAny
    ? T[P]
    : RecursivePartial<T[P]>;
};
type NonAny = number | boolean | string | symbol | null;

export const unionWithNullType = <T extends runtimeTypes.Mixed>(type: T) =>
  runtimeTypes.union([type, runtimeTypes.null]);

export const stringEnum = <T extends object>(enumObj: T, enumName = 'enum') =>
  new runtimeTypes.Type<T[keyof T], string>(
    enumName,
    (u): u is T[keyof T] => Object.values(enumObj).includes(u),
    (u, c) =>
      Object.values(enumObj).includes(u)
        ? runtimeTypes.success(u as T[keyof T])
        : runtimeTypes.failure(u, c),
    (a) => a as unknown as string
  );

/**
 * Unreachable Assertion helper for scenarios like exhaustive switches.
 * For references see: https://stackoverflow.com/questions/39419170/how-do-i-check-that-a-switch-block-is-exhaustive-in-typescript
 * This "x" should _always_ be a type of "never" and not change to "unknown" or any other type. See above link or the generic
 * concept of exhaustive checks in switch blocks.
 *
 * Optionally you can avoid the use of this by using early returns and TypeScript will clear your type checking without complaints
 * but there are situations and times where this function might still be needed.
 *
 * If you see an error, DO NOT cast "as never" such as:
 * assertUnreachable(x as never) // BUG IN YOUR CODE NOW AND IT WILL THROW DURING RUNTIME
 * If you see code like that remove it, as that deactivates the intent of this utility.
 * If you need to do that, then you should remove assertUnreachable from your code and
 * use a default at the end of the switch instead.
 * @param x Unreachable field
 * @param message Message of error thrown
 */
export const assertUnreachable = (
  x: never, // This should always be a type of "never"
  message = 'Unknown Field in switch statement'
): never => {
  throw new Error(`${message}: ${x}`);
};

type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };
/**
 * The XOR (exclusive OR) allows to ensure that a variable conforms to only one of several possible types.
 * Read more: https://medium.com/@aeron169/building-a-xor-type-in-typescript-5f4f7e709a9d
 */
export type XOR<T, U> = T | U extends object ? (Without<T, U> & U) | (Without<U, T> & T) : T | U;

/**
 * This utility type is used to extract the Nth parameter of a function type.
 * For example, `Parameter<0, (foo: string, bar: number) => void>` will be `string`.
 *
 * This helps streamline situations where using the built-in Parameters<T>[N] can be confusing.
 * Example:
 * ```ts
 * type Foo = Pick<NonNullable<Parameters<MyObject["foo"]["bar"]>[0]>, "baz">;
 * type Foo = Pick<NonNullable<Parameter<0, MyObject["foo"]["bar"]>>, "baz">;
 * ```
 *
 * @param N The index of the parameter to extract.
 * @param T The function type from which to extract the parameter.
 */
export type Parameter<N extends number, T> = T extends (...args: infer P) => unknown ? P[N] : never;
