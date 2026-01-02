/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KeyValuePair } from '@kbn/key-value-metadata-table';

/**
 * Sorts and maps the record into an array of `key`/`value` objects. Flattens multi-values into single value items.
 */
export function asKeyValuePairs<T extends Record<string, any>>(record?: T | null): KeyValuePair[] {
  return record
    ? Object.keys(record)
        .sort()
        .flatMap((key) => {
          const value = record[key];

          return Array.isArray(value)
            ? value.map((item, index) => ({
                key: value.length > 1 ? `${key}.${index}` : key,
                value: item,
              }))
            : { key, value };
        })
    : [];
}
