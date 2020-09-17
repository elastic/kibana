/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';

import { foldLeftRight, getPaths } from '../../shared_imports';

import { DefaultCreateCommentsArray } from './default_create_comments_array';
import { CreateCommentsArray } from './create_comment';
import { getCreateCommentsArrayMock } from './create_comment.mock';
import { getCommentsArrayMock } from './comment.mock';

describe('default_create_comments_array', () => {
  test('it should pass validation when an empty array', () => {
    const payload: CreateCommentsArray = [];
    const decoded = DefaultCreateCommentsArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should pass validation when an array of comments', () => {
    const payload: CreateCommentsArray = getCreateCommentsArrayMock();
    const decoded = DefaultCreateCommentsArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should strip out "created_at" and "created_by" if they are passed in', () => {
    const payload = getCommentsArrayMock();
    const decoded = DefaultCreateCommentsArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    // TODO: Known weird error formatting that is on our list to address
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual([
      { comment: 'some old comment' },
      { comment: 'some old comment' },
    ]);
  });

  test('it should not pass validation when an array of numbers', () => {
    const payload = [1];
    const decoded = DefaultCreateCommentsArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    // TODO: Known weird error formatting that is on our list to address
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "1" supplied to "Array<{| comment: NonEmptyString |}>"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should not pass validation when an array of strings', () => {
    const payload = ['some string'];
    const decoded = DefaultCreateCommentsArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "some string" supplied to "Array<{| comment: NonEmptyString |}>"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should return a default array entry', () => {
    const payload = null;
    const decoded = DefaultCreateCommentsArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual([]);
  });
});
