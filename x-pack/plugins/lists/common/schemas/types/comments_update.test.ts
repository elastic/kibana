/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';

import { foldLeftRight, getPaths } from '../../siem_common_deps';

import { getCommentsUpdateArrayMock } from './comments_update.mock';
import {
  CommentsUpdateArray,
  CommentsUpdateArrayOrUndefined,
  commentsUpdateArray,
  commentsUpdateArrayOrUndefined,
} from './comments_update';
import { getCommentsMock } from './comments.mock';
import { getCommentsNewMock } from './comments_new.mock';

describe('CommentsUpdate', () => {
  describe('commentsUpdateArray', () => {
    test('it should validate an array of comments', () => {
      const payload = getCommentsUpdateArrayMock();
      const decoded = commentsUpdateArray.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it a', () => {
      const payload = [getCommentsMock()];
      const decoded = commentsUpdateArray.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it b', () => {
      const payload = [getCommentsNewMock()];
      const decoded = commentsUpdateArray.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should not validate when undefined', () => {
      const payload = undefined;
      const decoded = commentsUpdateArray.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual(['Invalid value "undefined" supplied to ""']);
      expect(message.schema).toEqual({});
    });

    test('it should not validate when array includes non comments types', () => {
      const payload = ([1] as unknown) as CommentsUpdateArray;
      const decoded = commentsUpdateArray.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "1" supplied to ""',
        'Invalid value "1" supplied to ""',
        'Invalid value "1" supplied to ""',
      ]);
      expect(message.schema).toEqual({});
    });
  });

  describe('commentsUpdateArrayOrUndefined', () => {
    test('it should validate an array of comments', () => {
      const payload = getCommentsUpdateArrayMock();
      const decoded = commentsUpdateArrayOrUndefined.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should validate when undefined', () => {
      const payload = undefined;
      const decoded = commentsUpdateArrayOrUndefined.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should not validate when array includes non comments types', () => {
      const payload = ([1] as unknown) as CommentsUpdateArrayOrUndefined;
      const decoded = commentsUpdateArray.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "1" supplied to ""',
        'Invalid value "1" supplied to ""',
        'Invalid value "1" supplied to ""',
      ]);
      expect(message.schema).toEqual({});
    });
  });
});
