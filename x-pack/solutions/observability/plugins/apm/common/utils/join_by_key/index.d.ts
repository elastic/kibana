import type { UnionToIntersection, ValuesType } from 'utility-types';
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
export type JoinedReturnType<T extends Record<string, any>, U extends UnionToIntersection<T>> = Array<Partial<U> & {
    [k in keyof T]: T[k];
}>;
type ArrayOrSingle<T> = T | T[];
export declare function joinByKey<T extends Record<string, any>, U extends UnionToIntersection<T>, V extends ArrayOrSingle<keyof T & keyof U>>(items: T[], key: V): JoinedReturnType<T, U>;
export declare function joinByKey<T extends Record<string, any>, U extends UnionToIntersection<T>, V extends ArrayOrSingle<keyof T & keyof U>, W extends JoinedReturnType<T, U>, X extends (a: T, b: T) => ValuesType<W>>(items: T[], key: V, mergeFn: X): W;
export {};
