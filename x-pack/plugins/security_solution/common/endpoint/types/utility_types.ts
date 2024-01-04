/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export type PromiseResolvedValue<T extends Promise<any>> = T extends Promise<infer Value>
  ? Value
  : never;

/**
 * Deeply convert a immutable type (those with `readonly` properties) to a mutable type
 */
export type DeepMutable<T> = T extends Record<any, any>
  ? { -readonly [K in keyof T]: DeepMutable<T[K]> }
  : T;
