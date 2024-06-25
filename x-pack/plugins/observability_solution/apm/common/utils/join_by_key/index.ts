/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UnionToIntersection, ValuesType } from 'utility-types';
import { merge, castArray } from 'lodash';
import stableStringify from 'json-stable-stringify';

/**
 * Joins a list of records by a given key. Key can be any type of value, from
 * strings to plain objects, as long as it is present in all records. `isEqual`
 * is used for comparing keys.
 *
 * UnionToIntersection is needed to get all keys of union types, see below for
 * example.
 *
 const agentNames = [{ serviceName: '', agentName: '' }];
 const transactionRates = [{ serviceName: '', transactionsPerMinute: 1 }];
 const flattened = joinByKey(
  [...agentNames, ...transactionRates],
  'serviceName'
 );
*/

export type JoinedReturnType<
  T extends Record<string, any>,
  U extends UnionToIntersection<T>
> = Array<
  Partial<U> & {
    [k in keyof T]: T[k];
  }
>;

type ArrayOrSingle<T> = T | T[];

export function joinByKey<
  T extends Record<string, any>,
  U extends UnionToIntersection<T>,
  V extends ArrayOrSingle<keyof T & keyof U>
>(items: T[], key: V): JoinedReturnType<T, U>;

export function joinByKey<
  T extends Record<string, any>,
  U extends UnionToIntersection<T>,
  V extends ArrayOrSingle<keyof T & keyof U>,
  W extends JoinedReturnType<T, U>,
  X extends (a: T, b: T) => ValuesType<W>
>(items: T[], key: V, mergeFn: X): W;

export function joinByKey(
  items: Array<Record<string, any>>,
  key: string | string[],
  mergeFn: Function = (a: Record<string, any>, b: Record<string, any>) => merge({}, a, b)
) {
  const keys = castArray(key);
  // Create a map to quickly query the key of group.
  const map = new Map();
  items.forEach((current) => {
    // The key of the map is a stable JSON string of the values from given keys.
    // We need stable JSON string to support plain object values.
    const stableKey = stableStringify(keys.map((k) => current[k]));

    if (map.has(stableKey)) {
      const item = map.get(stableKey);
      // delete and set the key to put it last
      map.delete(stableKey);
      map.set(stableKey, mergeFn(item, current));
    } else {
      map.set(stableKey, { ...current });
    }
  });
  return [...map.values()];
}
