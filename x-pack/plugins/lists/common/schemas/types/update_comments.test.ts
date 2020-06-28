/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';

import { foldLeftRight, getPaths } from '../../siem_common_deps';

import { getUpdateCommentsArrayMock } from './update_comments.mock';
import {
  UpdateCommentsArray,
  UpdateCommentsArrayOrUndefined,
  updateCommentsArray,
  updateCommentsArrayOrUndefined,
} from './update_comments';
import { getCommentsMock } from './comments.mock';
import { getCreateCommentsMock } from './create_comments.mock';

describe('CommentsUpdate', () => {
  describe('updateCommentsArray', () => {
    test('it should validate an array of comments', () => {
      const payload = getUpdateCommentsArrayMock();
      const decoded = updateCommentsArray.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should validate an array of existing comments', () => {
      const payload = [getCommentsMock()];
      const decoded = updateCommentsArray.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should validate an array of new comments', () => {
      const payload = [getCreateCommentsMock()];
      const decoded = updateCommentsArray.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should not validate when undefined', () => {
      const payload = undefined;
      const decoded = updateCommentsArray.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "undefined" supplied to "Array<(({| comment: string, created_at: string, created_by: string |} & Partial<{| updated_at: string, updated_by: string |}>) | {| comment: string |})>"',
      ]);
      expect(message.schema).toEqual({});
    });

    test('it should not validate when array includes non comments types', () => {
      const payload = ([1] as unknown) as UpdateCommentsArray;
      const decoded = updateCommentsArray.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "1" supplied to "Array<(({| comment: string, created_at: string, created_by: string |} & Partial<{| updated_at: string, updated_by: string |}>) | {| comment: string |})>"',
        'Invalid value "1" supplied to "Array<(({| comment: string, created_at: string, created_by: string |} & Partial<{| updated_at: string, updated_by: string |}>) | {| comment: string |})>"',
        'Invalid value "1" supplied to "Array<(({| comment: string, created_at: string, created_by: string |} & Partial<{| updated_at: string, updated_by: string |}>) | {| comment: string |})>"',
      ]);
      expect(message.schema).toEqual({});
    });
  });

  describe('updateCommentsArrayOrUndefined', () => {
    test('it should validate an array of comments', () => {
      const payload = getUpdateCommentsArrayMock();
      const decoded = updateCommentsArrayOrUndefined.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should validate when undefined', () => {
      const payload = undefined;
      const decoded = updateCommentsArrayOrUndefined.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should not validate when array includes non comments types', () => {
      const payload = ([1] as unknown) as UpdateCommentsArrayOrUndefined;
      const decoded = updateCommentsArray.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "1" supplied to "Array<(({| comment: string, created_at: string, created_by: string |} & Partial<{| updated_at: string, updated_by: string |}>) | {| comment: string |})>"',
        'Invalid value "1" supplied to "Array<(({| comment: string, created_at: string, created_by: string |} & Partial<{| updated_at: string, updated_by: string |}>) | {| comment: string |})>"',
        'Invalid value "1" supplied to "Array<(({| comment: string, created_at: string, created_by: string |} & Partial<{| updated_at: string, updated_by: string |}>) | {| comment: string |})>"',
      ]);
      expect(message.schema).toEqual({});
    });
  });
});
