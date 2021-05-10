/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const exceptionListSavedObjectType = 'exception-list';
export const exceptionListAgnosticSavedObjectType = 'exception-list-agnostic';
export type SavedObjectType = 'exception-list' | 'exception-list-agnostic';

/**
 * This makes any optional property the same as Required<T> would but also has the
 * added benefit of keeping your undefined.
 *
 * For example:
 * type A = RequiredKeepUndefined<{ a?: undefined; b: number }>;
 *
 * will yield a type of:
 * type A = { a: undefined; b: number; }
 * @deprecated This has no replacement. We should stop using/relying on this and just remove it.
 */
export type RequiredKeepUndefined<T> = { [K in keyof T]-?: [T[K]] } extends infer U
  ? U extends Record<keyof U, [unknown]>
    ? { [K in keyof U]: U[K][0] }
    : never
  : never;
