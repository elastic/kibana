/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';

import { DATE_NOW } from '../../constants.mock';
import { foldLeftRight, getPaths } from '../../siem_common_deps';

import { getCommentsArrayMock, getCommentsMock } from './comments.mock';
import {
  Comments,
  CommentsArray,
  CommentsArrayOrUndefined,
  comments,
  commentsArray,
  commentsArrayOrUndefined,
} from './comments';

describe('Comments', () => {
  describe('comments', () => {
    test('it should validate a comments', () => {
      const payload = getCommentsMock();
      const decoded = comments.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should validate with "updated_at" and "updated_by"', () => {
      const payload = getCommentsMock();
      payload.updated_at = DATE_NOW;
      payload.updated_by = 'someone';
      const decoded = comments.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should not validate when undefined', () => {
      const payload = undefined;
      const decoded = comments.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "undefined" supplied to "({| comment: string, created_at: string, created_by: string |} & Partial<{| updated_at: string, updated_by: string |}>)"',
        'Invalid value "undefined" supplied to "({| comment: string, created_at: string, created_by: string |} & Partial<{| updated_at: string, updated_by: string |}>)"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('it should not validate when "comment" is not a string', () => {
      const payload: Omit<Comments, 'comment'> & { comment: string[] } = {
        ...getCommentsMock(),
        comment: ['some value'],
      };
      const decoded = comments.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "["some value"]" supplied to "comment"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('it should not validate when "created_at" is not a string', () => {
      const payload: Omit<Comments, 'created_at'> & { created_at: number } = {
        ...getCommentsMock(),
        created_at: 1,
      };
      const decoded = comments.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "1" supplied to "created_at"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('it should not validate when "created_by" is not a string', () => {
      const payload: Omit<Comments, 'created_by'> & { created_by: number } = {
        ...getCommentsMock(),
        created_by: 1,
      };
      const decoded = comments.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "1" supplied to "created_by"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('it should not validate when "updated_at" is not a string', () => {
      const payload: Omit<Comments, 'updated_at'> & { updated_at: number } = {
        ...getCommentsMock(),
        updated_at: 1,
      };
      const decoded = comments.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "1" supplied to "updated_at"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('it should not validate when "updated_by" is not a string', () => {
      const payload: Omit<Comments, 'updated_by'> & { updated_by: number } = {
        ...getCommentsMock(),
        updated_by: 1,
      };
      const decoded = comments.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "1" supplied to "updated_by"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('it should strip out extra keys', () => {
      const payload: Comments & {
        extraKey?: string;
      } = getCommentsMock();
      payload.extraKey = 'some value';
      const decoded = comments.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(getCommentsMock());
    });
  });

  describe('commentsArray', () => {
    test('it should validate an array of comments', () => {
      const payload = getCommentsArrayMock();
      const decoded = commentsArray.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should validate when a comments includes "updated_at" and "updated_by"', () => {
      const commentsPayload = getCommentsMock();
      commentsPayload.updated_at = DATE_NOW;
      commentsPayload.updated_by = 'someone';
      const payload = [{ ...commentsPayload }, ...getCommentsArrayMock()];
      const decoded = commentsArray.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should not validate when undefined', () => {
      const payload = undefined;
      const decoded = commentsArray.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "undefined" supplied to "Array<({| comment: string, created_at: string, created_by: string |} & Partial<{| updated_at: string, updated_by: string |}>)>"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('it should not validate when array includes non comments types', () => {
      const payload = ([1] as unknown) as CommentsArray;
      const decoded = commentsArray.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "1" supplied to "Array<({| comment: string, created_at: string, created_by: string |} & Partial<{| updated_at: string, updated_by: string |}>)>"',
        'Invalid value "1" supplied to "Array<({| comment: string, created_at: string, created_by: string |} & Partial<{| updated_at: string, updated_by: string |}>)>"',
      ]);
      expect(message.schema).toEqual({});
    });
  });

  describe('commentsArrayOrUndefined', () => {
    test('it should validate an array of comments', () => {
      const payload = getCommentsArrayMock();
      const decoded = commentsArrayOrUndefined.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should validate when undefined', () => {
      const payload = undefined;
      const decoded = commentsArrayOrUndefined.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should not validate when array includes non comments types', () => {
      const payload = ([1] as unknown) as CommentsArrayOrUndefined;
      const decoded = commentsArray.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "1" supplied to "Array<({| comment: string, created_at: string, created_by: string |} & Partial<{| updated_at: string, updated_by: string |}>)>"',
        'Invalid value "1" supplied to "Array<({| comment: string, created_at: string, created_by: string |} & Partial<{| updated_at: string, updated_by: string |}>)>"',
      ]);
      expect(message.schema).toEqual({});
    });
  });
});
