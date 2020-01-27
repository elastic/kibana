/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * A deep readonly type that will make all children of a given object readonly recursively
 */
export type Immutable<T> = T extends undefined | null | boolean | string | number
  ? T
  : T extends Array<infer U>
  ? ImmutableArray<U>
  : T extends Map<infer K, infer V>
  ? ImmutableMap<K, V>
  : T extends Set<infer M>
  ? ImmutableSet<M>
  : ImmutableObject<T>;

export type ImmutableArray<T> = ReadonlyArray<Immutable<T>>;
export type ImmutableMap<K, V> = ReadonlyMap<Immutable<K>, Immutable<V>>;
export type ImmutableSet<T> = ReadonlySet<Immutable<T>>;
export type ImmutableObject<T> = { readonly [K in keyof T]: Immutable<T[K]> };

export type AlertData = Immutable<{
  value: {
    source: {
      endgame: {
        data: {
          file_operation: string;
          malware_classification: {
            score: number;
          };
        };
        metadata: {
          key: string;
        };
        timestamp_utc: Date;
      };
      labels: {
        endpoint_id: string;
      };
      host: {
        hostname: string;
        ip: string;
        os: {
          name: string;
        };
      };
    };
  };
}>;

export type PageId = 'alertsPage' | 'endpointListPage';
