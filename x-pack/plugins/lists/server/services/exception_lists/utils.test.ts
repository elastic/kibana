/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import sinon from 'sinon';
import moment from 'moment';

import { DATE_NOW, USER } from '../../../common/constants.mock';

import {
  isCommentEqual,
  transformCreateCommentsToComments,
  transformUpdateComments,
  transformUpdateCommentsToComments,
} from './utils';

describe('utils', () => {
  const anchor = '2020-06-17T20:34:51.337Z';
  const unix = moment(anchor).valueOf();
  let clock: sinon.SinonFakeTimers;

  beforeEach(() => {
    clock = sinon.useFakeTimers(unix);
  });

  afterEach(() => {
    clock.restore();
  });

  describe('#transformUpdateCommentsToComments', () => {
    test('it returns empty array if "comments" is undefined and no comments exist', () => {
      const comments = transformUpdateCommentsToComments({
        comments: undefined,
        existingComments: [],
        user: 'lily',
      });

      expect(comments).toEqual([]);
    });

    test('it formats newly added comments', () => {
      const comments = transformUpdateCommentsToComments({
        comments: [
          { comment: 'Im an old comment', created_at: DATE_NOW, created_by: 'lily' },
          { comment: 'Im a new comment' },
        ],
        existingComments: [
          { comment: 'Im an old comment', created_at: DATE_NOW, created_by: 'lily' },
        ],
        user: 'lily',
      });

      expect(comments).toEqual([
        {
          comment: 'Im an old comment',
          created_at: anchor,
          created_by: 'lily',
        },
        {
          comment: 'Im a new comment',
          created_at: anchor,
          created_by: 'lily',
        },
      ]);
    });

    test('it formats multiple newly added comments', () => {
      const comments = transformUpdateCommentsToComments({
        comments: [
          { comment: 'Im an old comment', created_at: DATE_NOW, created_by: 'lily' },
          { comment: 'Im a new comment' },
          { comment: 'Im another new comment' },
        ],
        existingComments: [
          { comment: 'Im an old comment', created_at: DATE_NOW, created_by: 'lily' },
        ],
        user: 'lily',
      });

      expect(comments).toEqual([
        {
          comment: 'Im an old comment',
          created_at: anchor,
          created_by: 'lily',
        },
        {
          comment: 'Im a new comment',
          created_at: anchor,
          created_by: 'lily',
        },
        {
          comment: 'Im another new comment',
          created_at: anchor,
          created_by: 'lily',
        },
      ]);
    });

    test('it should not throw if comments match existing comments', () => {
      const comments = transformUpdateCommentsToComments({
        comments: [{ comment: 'Im an old comment', created_at: DATE_NOW, created_by: 'lily' }],
        existingComments: [
          { comment: 'Im an old comment', created_at: DATE_NOW, created_by: 'lily' },
        ],
        user: 'lily',
      });

      expect(comments).toEqual([
        {
          comment: 'Im an old comment',
          created_at: anchor,
          created_by: 'lily',
        },
      ]);
    });

    test('it does not throw if user tries to update one of their own existing comments', () => {
      const comments = transformUpdateCommentsToComments({
        comments: [
          {
            comment: 'Im an old comment that is trying to be updated',
            created_at: DATE_NOW,
            created_by: 'lily',
          },
        ],
        existingComments: [
          { comment: 'Im an old comment', created_at: DATE_NOW, created_by: 'lily' },
        ],
        user: 'lily',
      });

      expect(comments).toEqual([
        {
          comment: 'Im an old comment that is trying to be updated',
          created_at: DATE_NOW,
          created_by: 'lily',
          updated_at: anchor,
          updated_by: 'lily',
        },
      ]);
    });

    test('it throws an error if user tries to update their comment, without passing in the "created_at" and "created_by" properties', () => {
      expect(() =>
        transformUpdateCommentsToComments({
          comments: [
            {
              comment: 'Im an old comment that is trying to be updated',
            },
          ],
          existingComments: [
            { comment: 'Im an old comment', created_at: DATE_NOW, created_by: 'lily' },
          ],
          user: 'lily',
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"When trying to update a comment, \\"created_at\\" and \\"created_by\\" must be present"`
      );
    });

    test('it throws an error if user tries to delete comments', () => {
      expect(() =>
        transformUpdateCommentsToComments({
          comments: [],
          existingComments: [
            { comment: 'Im an old comment', created_at: DATE_NOW, created_by: 'lily' },
          ],
          user: 'lily',
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Comments cannot be deleted, only new comments may be added"`
      );
    });

    test('it throws if user tries to update existing comment timestamp', () => {
      expect(() =>
        transformUpdateCommentsToComments({
          comments: [{ comment: 'Im an old comment', created_at: anchor, created_by: 'lily' }],
          existingComments: [
            { comment: 'Im an old comment', created_at: DATE_NOW, created_by: 'lily' },
          ],
          user: 'bane',
        })
      ).toThrowErrorMatchingInlineSnapshot(`"Not authorized to edit others comments"`);
    });

    test('it throws if user tries to update existing comment author', () => {
      expect(() =>
        transformUpdateCommentsToComments({
          comments: [{ comment: 'Im an old comment', created_at: anchor, created_by: 'lily' }],
          existingComments: [
            { comment: 'Im an old comment', created_at: DATE_NOW, created_by: 'me!' },
          ],
          user: 'bane',
        })
      ).toThrowErrorMatchingInlineSnapshot(`"Not authorized to edit others comments"`);
    });

    test('it throws if user tries to update an existing comment that is not their own', () => {
      expect(() =>
        transformUpdateCommentsToComments({
          comments: [
            {
              comment: 'Im an old comment that is trying to be updated',
              created_at: DATE_NOW,
              created_by: 'lily',
            },
          ],
          existingComments: [
            { comment: 'Im an old comment', created_at: DATE_NOW, created_by: 'lily' },
          ],
          user: 'bane',
        })
      ).toThrowErrorMatchingInlineSnapshot(`"Not authorized to edit others comments"`);
    });

    test('it throws if user tries to update order of comments', () => {
      expect(() =>
        transformUpdateCommentsToComments({
          comments: [
            { comment: 'Im a new comment' },
            { comment: 'Im an old comment', created_at: DATE_NOW, created_by: 'lily' },
          ],
          existingComments: [
            { comment: 'Im an old comment', created_at: DATE_NOW, created_by: 'lily' },
          ],
          user: 'lily',
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"When trying to update a comment, \\"created_at\\" and \\"created_by\\" must be present"`
      );
    });

    test('it throws an error if user tries to add comment formatted as existing comment when none yet exist', () => {
      expect(() =>
        transformUpdateCommentsToComments({
          comments: [
            { comment: 'Im an old comment', created_at: DATE_NOW, created_by: 'lily' },
            { comment: 'Im a new comment' },
          ],
          existingComments: [],
          user: 'lily',
        })
      ).toThrowErrorMatchingInlineSnapshot(`"Only new comments may be added"`);
    });

    test('it throws if empty comment exists', () => {
      expect(() =>
        transformUpdateCommentsToComments({
          comments: [
            { comment: 'Im an old comment', created_at: DATE_NOW, created_by: 'lily' },
            { comment: '    ' },
          ],
          existingComments: [
            { comment: 'Im an old comment', created_at: DATE_NOW, created_by: 'lily' },
          ],
          user: 'lily',
        })
      ).toThrowErrorMatchingInlineSnapshot(`"Empty comments not allowed"`);
    });
  });

  describe('#transformCreateCommentsToComments', () => {
    test('it returns "undefined" if "comments" is "undefined"', () => {
      const comments = transformCreateCommentsToComments({
        comments: undefined,
        user: 'lily',
      });

      expect(comments).toBeUndefined();
    });

    test('it formats newly added comments', () => {
      const comments = transformCreateCommentsToComments({
        comments: [{ comment: 'Im a new comment' }, { comment: 'Im another new comment' }],
        user: 'lily',
      });

      expect(comments).toEqual([
        {
          comment: 'Im a new comment',
          created_at: anchor,
          created_by: 'lily',
        },
        {
          comment: 'Im another new comment',
          created_at: anchor,
          created_by: 'lily',
        },
      ]);
    });

    test('it throws an error if user tries to add an empty comment', () => {
      expect(() =>
        transformCreateCommentsToComments({
          comments: [{ comment: '   ' }],
          user: 'lily',
        })
      ).toThrowErrorMatchingInlineSnapshot(`"Empty comments not allowed"`);
    });
  });

  describe('#transformUpdateComments', () => {
    test('it updates comment and adds "updated_at" and "updated_by"', () => {
      const comments = transformUpdateComments({
        comment: {
          comment: 'Im an old comment that is trying to be updated',
          created_at: DATE_NOW,
          created_by: 'lily',
        },
        existingComment: {
          comment: 'Im an old comment',
          created_at: DATE_NOW,
          created_by: 'lily',
        },
        user: 'lily',
      });

      expect(comments).toEqual({
        comment: 'Im an old comment that is trying to be updated',
        created_at: '2020-04-20T15:25:31.830Z',
        created_by: 'lily',
        updated_at: anchor,
        updated_by: 'lily',
      });
    });

    test('it throws if user tries to update an existing comment that is not their own', () => {
      expect(() =>
        transformUpdateComments({
          comment: {
            comment: 'Im an old comment that is trying to be updated',
            created_at: DATE_NOW,
            created_by: 'lily',
          },
          existingComment: {
            comment: 'Im an old comment',
            created_at: DATE_NOW,
            created_by: 'lily',
          },
          user: 'bane',
        })
      ).toThrowErrorMatchingInlineSnapshot(`"Not authorized to edit others comments"`);
    });

    test('it throws if user tries to update an existing comments timestamp', () => {
      expect(() =>
        transformUpdateComments({
          comment: {
            comment: 'Im an old comment that is trying to be updated',
            created_at: anchor,
            created_by: 'lily',
          },
          existingComment: {
            comment: 'Im an old comment',
            created_at: DATE_NOW,
            created_by: 'lily',
          },
          user: 'lily',
        })
      ).toThrowErrorMatchingInlineSnapshot(`"Unable to update comment"`);
    });
  });

  describe('#isCommentEqual', () => {
    test('it returns false if "comment" values differ', () => {
      const result = isCommentEqual(
        {
          comment: 'some old comment',
          created_at: DATE_NOW,
          created_by: USER,
        },
        {
          comment: 'some older comment',
          created_at: DATE_NOW,
          created_by: USER,
        }
      );

      expect(result).toBeFalsy();
    });

    test('it returns false if "created_at" values differ', () => {
      const result = isCommentEqual(
        {
          comment: 'some old comment',
          created_at: DATE_NOW,
          created_by: USER,
        },
        {
          comment: 'some old comment',
          created_at: anchor,
          created_by: USER,
        }
      );

      expect(result).toBeFalsy();
    });

    test('it returns false if "created_by" values differ', () => {
      const result = isCommentEqual(
        {
          comment: 'some old comment',
          created_at: DATE_NOW,
          created_by: USER,
        },
        {
          comment: 'some old comment',
          created_at: DATE_NOW,
          created_by: 'lily',
        }
      );

      expect(result).toBeFalsy();
    });

    test('it returns true if comment values are equivalent', () => {
      const result = isCommentEqual(
        {
          comment: 'some old comment',
          created_at: DATE_NOW,
          created_by: USER,
        },
        {
          created_at: DATE_NOW,
          created_by: USER,
          // Disabling to assure that order doesn't matter
          // eslint-disable-next-line sort-keys
          comment: 'some old comment',
        }
      );

      expect(result).toBeTruthy();
    });
  });
});
