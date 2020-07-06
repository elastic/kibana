/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { UnionToIntersection, ValuesType } from 'utility-types';
import { isEqual } from 'lodash';

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

type JoinedReturnType<
  T extends Record<string, any>,
  U extends UnionToIntersection<T>,
  V extends keyof T & keyof U
> = Array<Partial<U> & Record<V, U[V]>>;

export function joinByKey<
  T extends Record<string, any>,
  U extends UnionToIntersection<T>,
  V extends keyof T & keyof U
>(items: T[], key: V): JoinedReturnType<T, U, V> {
  return items.reduce<JoinedReturnType<T, U, V>>((prev, current) => {
    let item = prev.find((prevItem) => isEqual(prevItem[key], current[key]));

    if (!item) {
      item = { ...current } as ValuesType<JoinedReturnType<T, U, V>>;
      prev.push(item);
    } else {
      Object.assign(item, current);
    }

    return prev;
  }, []);
}
