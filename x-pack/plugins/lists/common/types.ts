/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * This makes any optional property the same as Required<T> would but also has the
 * added benefit of keeping your undefined.
 *
 * For example:
 * type A = RequiredKeepUndefined<{ a?: undefined; b: number }>;
 *
 * will yield a type of:
 * type A = { a: undefined; b: number; }
 *
 */
export type RequiredKeepUndefined<T> = { [K in keyof T]-?: [T[K]] } extends infer U
  ? U extends Record<keyof U, [unknown]>
    ? { [K in keyof U]: U[K][0] }
    : never
  : never;

/**
 * This is just a helper to cleanup nasty intersections and unions to make them
 * readable from io.ts, it's an identity that strips away the uglyness of them.
 */
export type Identity<T> = {
  [P in keyof T]: T[P];
};
