/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import sinon from 'sinon';
import moment from 'moment';

import { DATE_NOW, USER } from '../../../common/constants.mock';

import { isCommentEqual, transformCommentsUpdate, transformNewComments } from './utils';

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

  describe('#transformCommentsUpdate', () => {
    test('it formats newly appended comments', () => {
      const comments = transformCommentsUpdate({
        existingComments: [
          { comment: 'Im an old comment', created_at: DATE_NOW, created_by: 'lily' },
        ],
        newComments: [
          { comment: 'Im an old comment', created_at: DATE_NOW, created_by: 'lily' },
          { comment: 'Im a new comment' },
        ],
        user: 'lily',
      });

      expect(comments).toEqual([
        {
          comment: 'Im an old comment',
          created_at: '2020-04-20T15:25:31.830Z',
          created_by: 'lily',
        },
        {
          comment: 'Im a new comment',
          created_at: '2020-06-17T20:34:51.337Z',
          created_by: 'lily',
        },
      ]);
    });

    test('it formats multiple newly appended comments', () => {
      const comments = transformCommentsUpdate({
        existingComments: [
          { comment: 'Im an old comment', created_at: DATE_NOW, created_by: 'lily' },
        ],
        newComments: [
          { comment: 'Im an old comment', created_at: DATE_NOW, created_by: 'lily' },
          { comment: 'Im a new comment' },
          { comment: 'Im another new comment' },
        ],
        user: 'lily',
      });

      expect(comments).toEqual([
        {
          comment: 'Im an old comment',
          created_at: '2020-04-20T15:25:31.830Z',
          created_by: 'lily',
        },
        {
          comment: 'Im a new comment',
          created_at: '2020-06-17T20:34:51.337Z',
          created_by: 'lily',
        },
        {
          comment: 'Im another new comment',
          created_at: '2020-06-17T20:34:51.337Z',
          created_by: 'lily',
        },
      ]);
    });

    test('it should not throw if comments match existing comments', () => {
      const comments = transformCommentsUpdate({
        existingComments: [
          { comment: 'Im an old comment', created_at: DATE_NOW, created_by: 'lily' },
        ],
        newComments: [{ comment: 'Im an old comment', created_at: DATE_NOW, created_by: 'lily' }],
        user: 'lily',
      });

      expect(comments).toEqual([
        {
          comment: 'Im an old comment',
          created_at: '2020-04-20T15:25:31.830Z',
          created_by: 'lily',
        },
      ]);
    });

    test('it throws if user tries to update existing comment timestamp', () => {
      expect(() =>
        transformCommentsUpdate({
          existingComments: [
            { comment: 'Im an old comment', created_at: DATE_NOW, created_by: 'lily' },
          ],
          newComments: [{ comment: 'Im an old comment', created_at: anchor, created_by: 'lily' }],
          user: 'bane',
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Existing comments cannot be edited, only new comments may be appended"`
      );
    });

    test('it throws if user tries to update existing comment author', () => {
      expect(() =>
        transformCommentsUpdate({
          existingComments: [
            { comment: 'Im an old comment', created_at: DATE_NOW, created_by: 'me!' },
          ],
          newComments: [{ comment: 'Im an old comment', created_at: anchor, created_by: 'lily' }],
          user: 'bane',
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Existing comments cannot be edited, only new comments may be appended"`
      );
    });

    test('it throws if user tries to update existing comment', () => {
      expect(() =>
        transformCommentsUpdate({
          existingComments: [
            { comment: 'Im an old comment', created_at: DATE_NOW, created_by: 'lily' },
          ],
          newComments: [
            {
              comment: 'Im an old comment that is trying to be updated',
              created_at: DATE_NOW,
              created_by: 'lily',
            },
          ],
          user: 'lily',
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Existing comments cannot be edited, only new comments may be appended"`
      );
    });

    test('it throws if user tries to update order of comments', () => {
      expect(() =>
        transformCommentsUpdate({
          existingComments: [
            { comment: 'Im an old comment', created_at: DATE_NOW, created_by: 'lily' },
          ],
          newComments: [
            { comment: 'Im a new comment' },
            { comment: 'Im an old comment', created_at: DATE_NOW, created_by: 'lily' },
          ],
          user: 'lily',
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Existing comments cannot be edited, only new comments may be appended"`
      );
    });

    test('it throws an error if user tries to add comment formatted as existing comment when none yet exist', () => {
      expect(() =>
        transformCommentsUpdate({
          existingComments: [],
          newComments: [
            { comment: 'Im an old comment', created_at: DATE_NOW, created_by: 'lily' },
            { comment: 'Im a new comment' },
          ],
          user: 'lily',
        })
      ).toThrowErrorMatchingInlineSnapshot(`"Only new comments may be appended"`);
    });
  });

  describe('#transformNewComments', () => {
    test('it formats newly appended comments', () => {
      const comments = transformNewComments({
        newComments: [{ comment: 'Im a new comment' }, { comment: 'Im another new comment' }],
        user: 'lily',
      });

      expect(comments).toEqual([
        {
          comment: 'Im a new comment',
          created_at: '2020-06-17T20:34:51.337Z',
          created_by: 'lily',
        },
        {
          comment: 'Im another new comment',
          created_at: '2020-06-17T20:34:51.337Z',
          created_by: 'lily',
        },
      ]);
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
