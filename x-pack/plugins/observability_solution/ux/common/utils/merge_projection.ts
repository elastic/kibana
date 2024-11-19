/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DeepPartial } from 'utility-types';
import { cloneDeep, isPlainObject, mergeWith } from 'lodash';

type PlainObject = Record<string | number | symbol, any>;

type SourceProjection = DeepPartial<any>;

type DeepMerge<T, U> = U extends PlainObject
  ? T extends PlainObject
    ? Omit<T, keyof U> & {
        [key in keyof U]: T extends { [k in key]: any } ? DeepMerge<T[key], U[key]> : U[key];
      }
    : U
  : U;

export function mergeProjection<T extends any, U extends SourceProjection>(
  target: T,
  source: U
): DeepMerge<T, U> {
  return mergeWith({}, cloneDeep(target), source, (a, b) => {
    if (isPlainObject(a) && isPlainObject(b)) {
      return undefined;
    }
    return b;
  }) as DeepMerge<T, U>;
}
