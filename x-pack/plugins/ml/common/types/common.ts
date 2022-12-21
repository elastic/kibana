/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MlPages } from '../constants/locator';

export interface Dictionary<TValue> {
  [id: string]: TValue;
}

// converts a dictionary to an array. note this loses the dictionary `key` information.
// however it's able to retain the type information of the dictionary elements.
export function dictionaryToArray<TValue>(dict: Dictionary<TValue>): TValue[] {
  return Object.keys(dict).map((key) => dict[key]);
}

// A recursive partial type to allow passing nested partial attributes.
// Used for example for the optional `jobConfig.dest.results_field` property.
export type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>;
};

export type DeepReadonly<T> = T extends Array<infer R>
  ? ReadonlyArray<DeepReadonly<T>>
  : T extends Function
  ? T
  : T extends object
  ? DeepReadonlyObject<T>
  : T;

type DeepReadonlyObject<T> = {
  readonly [P in keyof T]: DeepReadonly<T[P]>;
};

export interface ListingPageUrlState {
  pageSize: number;
  pageIndex: number;
  sortField: string;
  sortDirection: string;
  queryText?: string;
}

export type AppPageState<T> = {
  [key in MlPages]?: Partial<T>;
};

type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

export type XOR<T, U> = T | U extends object ? (Without<T, U> & U) | (Without<U, T> & T) : T | U;

export type AwaitReturnType<T> = T extends PromiseLike<infer U> ? U : T;
