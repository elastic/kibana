/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';

import { foldLeftRight, getPaths } from '../../siem_common_deps';

import { getCreateCommentsArrayMock, getCreateCommentsMock } from './create_comments.mock';
import {
  CreateComments,
  CreateCommentsArray,
  CreateCommentsArrayOrUndefined,
  createComments,
  createCommentsArray,
  createCommentsArrayOrUndefined,
} from './create_comments';

describe('CreateComments', () => {
  describe('createComments', () => {
    test('it should validate a comments', () => {
      const payload = getCreateCommentsMock();
      const decoded = createComments.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should not validate when undefined', () => {
      const payload = undefined;
      const decoded = createComments.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "undefined" supplied to "{| comment: string |}"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('it should not validate when "comment" is not a string', () => {
      const payload: Omit<CreateComments, 'comment'> & { comment: string[] } = {
        ...getCreateCommentsMock(),
        comment: ['some value'],
      };
      const decoded = createComments.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "["some value"]" supplied to "comment"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('it should strip out extra keys', () => {
      const payload: CreateComments & {
        extraKey?: string;
      } = getCreateCommentsMock();
      payload.extraKey = 'some value';
      const decoded = createComments.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(getCreateCommentsMock());
    });
  });

  describe('createCommentsArray', () => {
    test('it should validate an array of comments', () => {
      const payload = getCreateCommentsArrayMock();
      const decoded = createCommentsArray.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should not validate when undefined', () => {
      const payload = undefined;
      const decoded = createCommentsArray.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "undefined" supplied to "Array<{| comment: string |}>"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('it should not validate when array includes non comments types', () => {
      const payload = ([1] as unknown) as CreateCommentsArray;
      const decoded = createCommentsArray.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "1" supplied to "Array<{| comment: string |}>"',
      ]);
      expect(message.schema).toEqual({});
    });
  });

  describe('createCommentsArrayOrUndefined', () => {
    test('it should validate an array of comments', () => {
      const payload = getCreateCommentsArrayMock();
      const decoded = createCommentsArrayOrUndefined.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should validate when undefined', () => {
      const payload = undefined;
      const decoded = createCommentsArrayOrUndefined.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should not validate when array includes non comments types', () => {
      const payload = ([1] as unknown) as CreateCommentsArrayOrUndefined;
      const decoded = createCommentsArray.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "1" supplied to "Array<{| comment: string |}>"',
      ]);
      expect(message.schema).toEqual({});
    });
  });
});
