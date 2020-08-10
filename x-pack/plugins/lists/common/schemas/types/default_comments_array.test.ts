/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';

import { foldLeftRight, getPaths } from '../../shared_imports';

import { DefaultCommentsArray } from './default_comments_array';
import { CommentsArray } from './comment';
import { getCommentsArrayMock } from './comment.mock';

describe('default_comments_array', () => {
  test('it should pass validation when supplied an empty array', () => {
    const payload: CommentsArray = [];
    const decoded = DefaultCommentsArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should pass validation when supplied an array of comments', () => {
    const payload: CommentsArray = getCommentsArrayMock();
    const decoded = DefaultCommentsArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should fail validation when supplied an array of numbers', () => {
    const payload = [1];
    const decoded = DefaultCommentsArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "1" supplied to "Array<({| comment: NonEmptyString, created_at: string, created_by: string, id: NonEmptyString |} & Partial<{| updated_at: string, updated_by: string |}>)>"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should fail validation when supplied an array of strings', () => {
    const payload = ['some string'];
    const decoded = DefaultCommentsArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "some string" supplied to "Array<({| comment: NonEmptyString, created_at: string, created_by: string, id: NonEmptyString |} & Partial<{| updated_at: string, updated_by: string |}>)>"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should return a default array entry', () => {
    const payload = null;
    const decoded = DefaultCommentsArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual([]);
  });
});
