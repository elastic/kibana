/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import sinon from 'sinon';
import moment from 'moment';
import uuid from 'uuid';

import {
  transformCreateCommentsToComments,
  transformUpdateComments,
  transformUpdateCommentsToComments,
} from './utils';

jest.mock('uuid/v4');

describe('utils', () => {
  const oldDate = '2020-03-17T20:34:51.337Z';
  const dateNow = '2020-06-17T20:34:51.337Z';
  const unix = moment(dateNow).valueOf();
  let clock: sinon.SinonFakeTimers;

  beforeEach(() => {
    ((uuid.v4 as unknown) as jest.Mock)
      .mockImplementationOnce(() => '123')
      .mockImplementationOnce(() => '456');

    clock = sinon.useFakeTimers(unix);
  });

  afterEach(() => {
    clock.restore();
    jest.clearAllMocks();
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  describe('#transformUpdateCommentsToComments', () => {
    test('it throws if incoming comments is null and comments exist', () => {
      expect(() =>
        transformUpdateCommentsToComments({
          comments: undefined,
          existingComments: [
            { comment: 'Im an old comment', created_at: oldDate, created_by: 'lily', id: '1' },
          ],
          user: 'lily',
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Empty \\"[]\\" passed to \\"comments\\" - detected existing comments. Comments cannot be deleted."`
      );
    });

    test('it returns empty array if "comments" is undefined and no comments exist', () => {
      const comments = transformUpdateCommentsToComments({
        comments: undefined,
        existingComments: [],
        user: 'lily',
      });

      expect(comments).toEqual([]);
    });

    test('it throws if incoming comments count is less than existing comments count', () => {
      expect(() =>
        transformUpdateCommentsToComments({
          comments: [{ comment: 'Im an old comment', id: '1' }],
          existingComments: [
            { comment: 'Im an old comment', created_at: oldDate, created_by: 'lily', id: '1' },
            { comment: 'Im another old comment', created_at: oldDate, created_by: 'lily', id: '2' },
          ],
          user: 'lily',
        })
      ).toThrowErrorMatchingInlineSnapshot(`"Comments cannot be deleted."`);
    });

    test('it throws if matching id is not found', () => {
      expect(() =>
        transformUpdateCommentsToComments({
          comments: [{ comment: 'Im an old comment', id: '1' }, { comment: 'Im a new comment' }],
          existingComments: [
            { comment: 'Im an old comment', created_at: oldDate, created_by: 'lily', id: '1' },
            { comment: 'Im another old comment', created_at: oldDate, created_by: 'lily', id: '2' },
          ],
          user: 'lily',
        })
      ).toThrowErrorMatchingInlineSnapshot(`"Cannot delete comment id: 2"`);
    });

    test('it creates comment if checked that all existing comments are accounted for', () => {
      const comments = transformUpdateCommentsToComments({
        comments: [{ comment: 'Im an old comment', id: '1' }, { comment: 'Im a new comment' }],
        existingComments: [
          { comment: 'Im an old comment', created_at: oldDate, created_by: 'bane', id: '1' },
        ],
        user: 'lily',
      });

      expect(comments).toEqual([
        {
          comment: 'Im an old comment',
          created_at: oldDate,
          created_by: 'bane',
          id: '1',
        },
        {
          comment: 'Im a new comment',
          created_at: dateNow,
          created_by: 'lily',
          id: '123',
        },
      ]);
    });

    test('it updates comments of matching ids if comment text differs and user matches creator', () => {
      const comments = transformUpdateCommentsToComments({
        comments: [
          { comment: 'Im an old comment', id: '1' },
          { comment: 'Im trying to update an old comment', id: '2' },
          { comment: 'Im a new comment' },
        ],
        existingComments: [
          { comment: 'Im an old comment', created_at: oldDate, created_by: 'bane', id: '1' },
          { comment: 'Im another old comment', created_at: oldDate, created_by: 'lily', id: '2' },
        ],
        user: 'lily',
      });

      expect(comments).toEqual([
        {
          comment: 'Im an old comment',
          created_at: oldDate,
          created_by: 'bane',
          id: '1',
        },
        {
          comment: 'Im trying to update an old comment',
          created_at: oldDate,
          created_by: 'lily',
          id: '2',
          updated_at: dateNow,
          updated_by: 'lily',
        },
        {
          comment: 'Im a new comment',
          created_at: dateNow,
          created_by: 'lily',
          id: '123',
        },
      ]);
    });

    test('it returns existing comment if comment text does not differ', () => {
      const comments = transformUpdateCommentsToComments({
        comments: [
          { comment: 'Im an old comment', id: '1' },
          { comment: 'Im another old comment', id: '2' },
        ],
        existingComments: [
          { comment: 'Im an old comment', created_at: oldDate, created_by: 'bane', id: '1' },
          { comment: 'Im another old comment', created_at: oldDate, created_by: 'lily', id: '2' },
        ],
        user: 'lily',
      });

      expect(comments).toEqual([
        {
          comment: 'Im an old comment',
          created_at: oldDate,
          created_by: 'bane',
          id: '1',
        },
        {
          comment: 'Im another old comment',
          created_at: oldDate,
          created_by: 'lily',
          id: '2',
        },
      ]);
    });

    test('it formats multiple newly added comments', () => {
      const comments = transformUpdateCommentsToComments({
        comments: [
          { comment: 'Im an old comment', id: '1' },
          { comment: 'Im a new comment' },
          { comment: 'Im another new comment' },
        ],
        existingComments: [
          { comment: 'Im an old comment', created_at: oldDate, created_by: 'bane', id: '1' },
        ],
        user: 'lily',
      });

      expect(comments).toEqual([
        {
          comment: 'Im an old comment',
          created_at: oldDate,
          created_by: 'bane',
          id: '1',
        },
        {
          comment: 'Im a new comment',
          created_at: dateNow,
          created_by: 'lily',
          id: '123',
        },
        {
          comment: 'Im another new comment',
          created_at: dateNow,
          created_by: 'lily',
          id: '456',
        },
      ]);
    });
  });

  describe('#transformCreateCommentsToComments', () => {
    test('it formats newly added comments', () => {
      const comments = transformCreateCommentsToComments({
        incomingComments: [{ comment: 'Im a new comment' }, { comment: 'Im another new comment' }],
        user: 'lily',
      });

      expect(comments).toEqual([
        {
          comment: 'Im a new comment',
          created_at: dateNow,
          created_by: 'lily',
          id: '123',
        },
        {
          comment: 'Im another new comment',
          created_at: dateNow,
          created_by: 'lily',
          id: '456',
        },
      ]);
    });
  });

  describe('#transformUpdateComments', () => {
    test('it throws if incoming comment does not have an id', () => {
      expect(() =>
        transformUpdateComments({
          existingComment: {
            comment: 'Im an existing comment',
            created_at: oldDate,
            created_by: 'lily',
            id: '1',
          },
          incomingComment: {
            comment: 'Im updating an old comment',
          },
          user: 'bane',
        })
      ).toThrowErrorMatchingInlineSnapshot(`"Unable to update comment, missing \\"id\\""`);
    });

    test('it throws if user tries to update an existing comment that is not their own', () => {
      expect(() =>
        transformUpdateComments({
          existingComment: {
            comment: 'Im an existing comment',
            created_at: oldDate,
            created_by: 'lily',
            id: '1',
          },
          incomingComment: {
            comment: 'Im updating an old comment',
            id: '1',
          },
          user: 'bane',
        })
      ).toThrowErrorMatchingInlineSnapshot(`"Not authorized to edit others comments"`);
    });

    test('it allows user to update a comment that is their own', () => {
      const comments = transformUpdateComments({
        existingComment: {
          comment: 'Im an existing comment',
          created_at: oldDate,
          created_by: 'lily',
          id: '1',
        },
        incomingComment: {
          comment: 'Im updating an old comment',
          id: '1',
        },
        user: 'lily',
      });

      expect(comments).toEqual({
        comment: 'Im updating an old comment',
        created_at: oldDate,
        created_by: 'lily',
        id: '1',
        updated_at: dateNow,
        updated_by: 'lily',
      });
    });

    test('it returns existing comment without any changes if incoming comment matches existing comment', () => {
      const comments = transformUpdateComments({
        existingComment: {
          comment: 'Im an existing comment',
          created_at: oldDate,
          created_by: 'lily',
          id: '1',
        },
        incomingComment: {
          comment: 'Im an existing comment',
          id: '1',
        },
        user: 'lily',
      });

      expect(comments).toEqual({
        comment: 'Im an existing comment',
        created_at: oldDate,
        created_by: 'lily',
        id: '1',
      });
    });
  });
});
