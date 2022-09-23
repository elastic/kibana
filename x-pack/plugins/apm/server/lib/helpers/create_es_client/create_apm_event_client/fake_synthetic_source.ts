/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { isArray, isObjectLike, set, uniq } from 'lodash';

function flatten(
  target: Record<string, any>,
  source: Record<string, any>,
  toArray: boolean,
  prefix: string = ''
) {
  for (const key in source) {
    if (!Object.hasOwn(source, key)) {
      continue;
    }
    const value = source[key];
    if (value === undefined || value === null) {
      continue;
    }
    const nextKey = `${prefix}${key}`;
    if (isArray(value)) {
      value.forEach((val) => {
        flatten(target, val, true, `${nextKey}.`);
      });
    } else if (isObjectLike(value)) {
      flatten(target, value, toArray, `${nextKey}.`);
    } else if (toArray && Array.isArray(target[nextKey])) {
      target[nextKey].push(value);
    } else if (toArray) {
      target[nextKey] = [value];
    } else {
      target[nextKey] = value;
    }
  }
  return target;
}

export function fakeSyntheticSource(object: Record<string, any>) {
  const flattened = flatten({}, object, false, '');

  const unflattened = {};
  for (const key in flattened) {
    if (!Object.hasOwn(flattened, key)) {
      continue;
    }
    let val = flattened[key];
    if (Array.isArray(val)) {
      val = uniq(val).sort();
    }
    set(unflattened, key, val);
  }
  return unflattened;
}
