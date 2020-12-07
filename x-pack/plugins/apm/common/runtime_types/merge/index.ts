/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as t from 'io-ts';
import { merge as lodashMerge } from 'lodash';
import { isLeft } from 'fp-ts/lib/Either';
import { ValuesType } from 'utility-types';

export type MergeType<
  T extends t.Any[],
  U extends ValuesType<T> = ValuesType<T>
> = t.Type<U['_A'], U['_O'], U['_I']> & {
  _tag: 'MergeType';
  types: T;
};

// this is similar to t.intersection, but does a deep merge
// instead of a shallow merge

export function merge<A extends t.Mixed, B extends t.Mixed>(
  types: [A, B]
): MergeType<[A, B]>;

export function merge(types: t.Any[]) {
  const mergeType = new t.Type(
    'merge',
    (u): u is unknown => {
      return types.every((type) => type.is(u));
    },
    (input, context) => {
      const errors: t.Errors = [];

      const successes: unknown[] = [];

      const results = types.map((type, index) =>
        type.validate(
          input,
          context.concat({
            key: String(index),
            type,
            actual: input,
          })
        )
      );

      results.forEach((result) => {
        if (isLeft(result)) {
          errors.push(...result.left);
        } else {
          successes.push(result.right);
        }
      });

      const mergedValues = lodashMerge({}, ...successes);

      return errors.length > 0 ? t.failures(errors) : t.success(mergedValues);
    },
    (a) => types.reduce((val, type) => type.encode(val), a)
  );

  return {
    ...mergeType,
    _tag: 'MergeType',
    types,
  };
}
