/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UnionToIntersection, ValuesType } from 'utility-types';
import { isEqual, pull, merge, castArray } from 'lodash';

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
  mergeFn: Function = (a: Record<string, any>, b: Record<string, any>) =>
    merge({}, a, b)
) {
  const keys = castArray(key);
  return items.reduce<Array<Record<string, any>>>((prev, current) => {
    let item = prev.find((prevItem) =>
      keys.every((k) => isEqual(prevItem[k], current[k]))
    );

    if (!item) {
      item = { ...current };
      prev.push(item);
    } else {
      pull(prev, item).push(mergeFn(item, current));
    }

    return prev;
  }, []);
}
