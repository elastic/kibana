/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import moment from 'moment';
import uuid from 'uuid';

import { transformCreateCommentsToComments, transformUpdateCommentsToComments } from '.';

jest.mock('uuid/v4');

describe('utils', () => {
  const oldDate = '2020-03-17T20:34:51.337Z';
  const dateNow = '2020-06-17T20:34:51.337Z';
  const unix = moment(dateNow).valueOf();
  let clock: sinon.SinonFakeTimers;

  beforeEach(() => {
    (uuid.v4 as unknown as jest.Mock)
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
    test('it formats new comments', () => {
      const comments = transformUpdateCommentsToComments({
        comments: [{ comment: 'Im a new comment' }],
        existingComments: [],
        user: 'lily',
      });

      expect(comments).toEqual([
        {
          comment: 'Im a new comment',
          created_at: dateNow,
          created_by: 'lily',
          id: '123',
        },
      ]);
    });

    test('it formats new comments and preserves existing comments', () => {
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

    test('it returns existing comments if empty array passed for "comments"', () => {
      const comments = transformUpdateCommentsToComments({
        comments: [],
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
      ]);
    });

    test('it acts as append only, only modifying new comments', () => {
      const comments = transformUpdateCommentsToComments({
        comments: [{ comment: 'Im a new comment' }],
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
});
