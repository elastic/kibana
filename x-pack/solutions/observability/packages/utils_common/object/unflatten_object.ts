/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { set } from '@kbn/safer-lodash-set';
import { DedotObject } from '@kbn/utility-types';

export function unflattenObject<T extends Record<string, any>>(
  source: T,
  target: Record<string, any> = {}
): DedotObject<T> {
  // eslint-disable-next-line guard-for-in
  for (const key in source) {
    const val = source[key as keyof typeof source];
    if (Array.isArray(val)) {
      const unflattenedArray = val.map((item: unknown) => {
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          return unflattenObject(item);
        }
        return item;
      });
      set(target, key, unflattenedArray);
    } else {
      set(target, key, val);
    }
  }

  return target as DedotObject<T>;
}
