/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as runtimeTypes from 'io-ts';
import { ReactNode } from 'react';

// This type is for typing EuiDescriptionList
export interface DescriptionList {
  title: NonNullable<ReactNode>;
  description: NonNullable<ReactNode>;
}

export const unionWithNullType = <T extends runtimeTypes.Mixed>(type: T) =>
  runtimeTypes.union([type, runtimeTypes.null]);

export const stringEnum = <T>(enumObj: T, enumName = 'enum') =>
  new runtimeTypes.Type<T[keyof T], string>(
    enumName,
    (u): u is T[keyof T] => Object.values(enumObj).includes(u),
    (u, c) =>
      Object.values(enumObj).includes(u)
        ? runtimeTypes.success(u as T[keyof T])
        : runtimeTypes.failure(u, c),
    (a) => (a as unknown) as string
  );

/**
 * Unreachable Assertion helper for scenarios like exhaustive switches.
 * For references see: https://stackoverflow.com/questions/39419170/how-do-i-check-that-a-switch-block-is-exhaustive-in-typescript
 * This "x" should _always_ be a type of "never" and not change to "unknown" or any other type. See above link or the generic
 * concept of exhaustive checks in switch blocks.
 *
 * Optionally you can avoid the use of this by using early returns and TypeScript will clear your type checking without complaints
 * but there are situations and times where this function might still be needed.
 * @param x Unreachable field
 * @param message Message of error thrown
 */
export const assertUnreachable = (
  x: never, // This should always be a type of "never"
  message = 'Unknown Field in switch statement'
): never => {
  throw new Error(`${message}: ${x}`);
};
