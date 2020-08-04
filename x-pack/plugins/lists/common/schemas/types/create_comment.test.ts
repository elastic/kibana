/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';

import { foldLeftRight, getPaths } from '../../shared_imports';

import { getCreateCommentsArrayMock, getCreateCommentsMock } from './create_comment.mock';
import {
  CreateComment,
  CreateCommentsArray,
  CreateCommentsArrayOrUndefined,
  createComment,
  createCommentsArray,
  createCommentsArrayOrUndefined,
} from './create_comment';

describe('CreateComment', () => {
  describe('createComment', () => {
    test('it passes validation with a default comment', () => {
      const payload = getCreateCommentsMock();
      const decoded = createComment.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it fails validation when undefined', () => {
      const payload = undefined;
      const decoded = createComment.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "undefined" supplied to "{| comment: NonEmptyString |}"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('it fails validation when "comment" is not a string', () => {
      const payload: Omit<CreateComment, 'comment'> & { comment: string[] } = {
        ...getCreateCommentsMock(),
        comment: ['some value'],
      };
      const decoded = createComment.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "["some value"]" supplied to "comment"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('it should strip out extra keys', () => {
      const payload: CreateComment & {
        extraKey?: string;
      } = getCreateCommentsMock();
      payload.extraKey = 'some value';
      const decoded = createComment.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(getCreateCommentsMock());
    });
  });

  describe('createCommentsArray', () => {
    test('it passes validation an array of comments', () => {
      const payload = getCreateCommentsArrayMock();
      const decoded = createCommentsArray.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it fails validation when undefined', () => {
      const payload = undefined;
      const decoded = createCommentsArray.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "undefined" supplied to "Array<{| comment: NonEmptyString |}>"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('it fails validation when array includes non comments types', () => {
      const payload = ([1] as unknown) as CreateCommentsArray;
      const decoded = createCommentsArray.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "1" supplied to "Array<{| comment: NonEmptyString |}>"',
      ]);
      expect(message.schema).toEqual({});
    });
  });

  describe('createCommentsArrayOrUndefined', () => {
    test('it passes validation an array of comments', () => {
      const payload = getCreateCommentsArrayMock();
      const decoded = createCommentsArrayOrUndefined.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it passes validation when undefined', () => {
      const payload = undefined;
      const decoded = createCommentsArrayOrUndefined.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it fails validation when array includes non comments types', () => {
      const payload = ([1] as unknown) as CreateCommentsArrayOrUndefined;
      const decoded = createCommentsArray.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "1" supplied to "Array<{| comment: NonEmptyString |}>"',
      ]);
      expect(message.schema).toEqual({});
    });
  });
});
