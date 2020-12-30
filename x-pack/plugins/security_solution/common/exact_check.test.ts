/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { left, right, Either } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';

import { exactCheck, findDifferencesRecursive } from './exact_check';
import { foldLeftRight, getPaths } from './test_utils';

describe('exact_check', () => {
  test('it returns an error if given extra object properties', () => {
    const someType = t.exact(
      t.type({
        a: t.string,
      })
    );
    const payload = { a: 'test', b: 'test' };
    const decoded = someType.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "b"']);
    expect(message.schema).toEqual({});
  });

  test('it returns an error if the data type is not as expected', () => {
    type UnsafeCastForTest = Either<
      t.Errors,
      {
        a: number;
      }
    >;

    const someType = t.exact(
      t.type({
        a: t.string,
      })
    );

    const payload = { a: 1 };
    const decoded = someType.decode(payload);
    const checked = exactCheck(payload, decoded as UnsafeCastForTest);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['Invalid value "1" supplied to "a"']);
    expect(message.schema).toEqual({});
  });

  test('it does NOT return an error if given normal object properties', () => {
    const someType = t.exact(
      t.type({
        a: t.string,
      })
    );
    const payload = { a: 'test' };
    const decoded = someType.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it will return an existing error and not validate', () => {
    const payload = { a: 'test' };
    const validationError: t.ValidationError = {
      value: 'Some existing error',
      context: [],
      message: 'some error',
    };
    const error: t.Errors = [validationError];
    const leftValue = left(error);
    const checked = exactCheck(payload, leftValue);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['some error']);
    expect(message.schema).toEqual({});
  });

  test('it will work with a regular "right" payload without any decoding', () => {
    const payload = { a: 'test' };
    const rightValue = right(payload);
    const checked = exactCheck(payload, rightValue);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual({ a: 'test' });
  });

  test('it will work with decoding a null payload when the schema expects a null', () => {
    const someType = t.union([
      t.exact(
        t.type({
          a: t.string,
        })
      ),
      t.null,
    ]);
    const payload = null;
    const decoded = someType.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(null);
  });

  test('it should find no differences recursively with two empty objects', () => {
    const difference = findDifferencesRecursive({}, {});
    expect(difference).toEqual([]);
  });

  test('it should find a single difference with two objects with different keys', () => {
    const difference = findDifferencesRecursive({ a: 1 }, { b: 1 });
    expect(difference).toEqual(['a']);
  });

  test('it should find a two differences with two objects with multiple different keys', () => {
    const difference = findDifferencesRecursive({ a: 1, c: 1 }, { b: 1 });
    expect(difference).toEqual(['a', 'c']);
  });

  test('it should find no differences with two objects with the same keys', () => {
    const difference = findDifferencesRecursive({ a: 1, b: 1 }, { a: 1, b: 1 });
    expect(difference).toEqual([]);
  });

  test('it should find a difference with two deep objects with different same keys', () => {
    const difference = findDifferencesRecursive({ a: 1, b: { c: 1 } }, { a: 1, b: { d: 1 } });
    expect(difference).toEqual(['c']);
  });

  test('it should find a difference within an array', () => {
    const difference = findDifferencesRecursive({ a: 1, b: [{ c: 1 }] }, { a: 1, b: [{ a: 1 }] });
    expect(difference).toEqual(['c']);
  });

  test('it should find a no difference when using arrays that are identical', () => {
    const difference = findDifferencesRecursive({ a: 1, b: [{ c: 1 }] }, { a: 1, b: [{ c: 1 }] });
    expect(difference).toEqual([]);
  });

  test('it should find differences when one has an array and the other does not', () => {
    const difference = findDifferencesRecursive({ a: 1, b: [{ c: 1 }] }, { a: 1 });
    expect(difference).toEqual(['b', '[{"c":1}]']);
  });

  test('it should find differences when one has an deep object and the other does not', () => {
    const difference = findDifferencesRecursive({ a: 1, b: { c: 1 } }, { a: 1 });
    expect(difference).toEqual(['b', '{"c":1}']);
  });

  test('it should find differences when one has a deep object with multiple levels and the other does not', () => {
    const difference = findDifferencesRecursive({ a: 1, b: { c: { d: 1 } } }, { a: 1 });
    expect(difference).toEqual(['b', '{"c":{"d":1}}']);
  });

  test('it tests two deep objects as the same with no key differences', () => {
    const difference = findDifferencesRecursive(
      { a: 1, b: { c: { d: 1 } } },
      { a: 1, b: { c: { d: 1 } } }
    );
    expect(difference).toEqual([]);
  });

  test('it tests two deep objects with just one deep key difference', () => {
    const difference = findDifferencesRecursive(
      { a: 1, b: { c: { d: 1 } } },
      { a: 1, b: { c: { e: 1 } } }
    );
    expect(difference).toEqual(['d']);
  });

  test('it should not find any differences when the original and decoded are both null', () => {
    const difference = findDifferencesRecursive(null, null);
    expect(difference).toEqual([]);
  });
});
