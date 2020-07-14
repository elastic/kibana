/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';

import { foldLeftRight, getPaths } from '../../siem_common_deps';

import { DefaultUpdateCommentsArray } from './default_update_comments_array';
import { UpdateCommentsArray } from './update_comments';
import { getUpdateCommentsArrayMock } from './update_comments.mock';

describe('default_update_comments_array', () => {
  test('it should validate an empty array', () => {
    const payload: UpdateCommentsArray = [];
    const decoded = DefaultUpdateCommentsArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should validate an array of comments', () => {
    const payload: UpdateCommentsArray = getUpdateCommentsArrayMock();
    const decoded = DefaultUpdateCommentsArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should NOT validate an array of numbers', () => {
    const payload = [1];
    const decoded = DefaultUpdateCommentsArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    // TODO: Known weird error formatting that is on our list to address
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "1" supplied to "Array<(({| comment: string, created_at: string, created_by: string |} & Partial<{| updated_at: string, updated_by: string |}>) | {| comment: string |})>"',
      'Invalid value "1" supplied to "Array<(({| comment: string, created_at: string, created_by: string |} & Partial<{| updated_at: string, updated_by: string |}>) | {| comment: string |})>"',
      'Invalid value "1" supplied to "Array<(({| comment: string, created_at: string, created_by: string |} & Partial<{| updated_at: string, updated_by: string |}>) | {| comment: string |})>"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT validate an array of strings', () => {
    const payload = ['some string'];
    const decoded = DefaultUpdateCommentsArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "some string" supplied to "Array<(({| comment: string, created_at: string, created_by: string |} & Partial<{| updated_at: string, updated_by: string |}>) | {| comment: string |})>"',
      'Invalid value "some string" supplied to "Array<(({| comment: string, created_at: string, created_by: string |} & Partial<{| updated_at: string, updated_by: string |}>) | {| comment: string |})>"',
      'Invalid value "some string" supplied to "Array<(({| comment: string, created_at: string, created_by: string |} & Partial<{| updated_at: string, updated_by: string |}>) | {| comment: string |})>"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should return a default array entry', () => {
    const payload = null;
    const decoded = DefaultUpdateCommentsArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual([]);
  });
});
