/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';

import { foldLeftRight, getPaths } from '../../siem_common_deps';

import { getCommentsNewArrayMock, getCommentsNewMock } from './comments_new.mock';
import {
  CommentsNew,
  CommentsNewArray,
  CommentsNewArrayOrUndefined,
  commentsNew,
  commentsNewArray,
  commentsNewArrayOrUndefined,
} from './comments_new';

describe('CommentsNew', () => {
  describe('commentsNew', () => {
    test('it should validate a comments', () => {
      const payload = getCommentsNewMock();
      const decoded = commentsNew.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should not validate when undefined', () => {
      const payload = undefined;
      const decoded = commentsNew.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual(['Invalid value "undefined" supplied to ""']);
      expect(message.schema).toEqual({});
    });

    test('it should not validate when "comment" is not a string', () => {
      const payload: Omit<CommentsNew, 'comment'> & { comment: string[] } = {
        ...getCommentsNewMock(),
        comment: ['some value'],
      };
      const decoded = commentsNew.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "some value" supplied to "comment"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('it should strip out extra keys', () => {
      const payload: CommentsNew & {
        extraKey?: string;
      } = getCommentsNewMock();
      payload.extraKey = 'some value';
      const decoded = commentsNew.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(getCommentsNewMock());
    });
  });

  describe('commentsNewArray', () => {
    test('it should validate an array of comments', () => {
      const payload = getCommentsNewArrayMock();
      const decoded = commentsNewArray.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should not validate when undefined', () => {
      const payload = undefined;
      const decoded = commentsNewArray.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual(['Invalid value "undefined" supplied to ""']);
      expect(message.schema).toEqual({});
    });

    test('it should not validate when array includes non comments types', () => {
      const payload = ([1] as unknown) as CommentsNewArray;
      const decoded = commentsNewArray.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual(['Invalid value "1" supplied to ""']);
      expect(message.schema).toEqual({});
    });
  });

  describe('commentsNewArrayOrUndefined', () => {
    test('it should validate an array of comments', () => {
      const payload = getCommentsNewArrayMock();
      const decoded = commentsNewArrayOrUndefined.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should validate when undefined', () => {
      const payload = undefined;
      const decoded = commentsNewArrayOrUndefined.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should not validate when array includes non comments types', () => {
      const payload = ([1] as unknown) as CommentsNewArrayOrUndefined;
      const decoded = commentsNewArray.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual(['Invalid value "1" supplied to ""']);
      expect(message.schema).toEqual({});
    });
  });
});
