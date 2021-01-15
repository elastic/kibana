/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CommentType } from '../../../../../case/common/api';
import { Comment } from '../../containers/types';

import { getRuleIdsFromComments, buildAlertsQuery } from './helpers';

const comments: Comment[] = [
  {
    type: CommentType.alert,
    alertId: 'alert-id-1',
    index: 'alert-index-1',
    id: 'comment-id',
    createdAt: '2020-02-19T23:06:33.798Z',
    createdBy: { username: 'elastic' },
    pushedAt: null,
    pushedBy: null,
    updatedAt: null,
    updatedBy: null,
    version: 'WzQ3LDFc',
  },
  {
    type: CommentType.alert,
    alertId: 'alert-id-2',
    index: 'alert-index-2',
    id: 'comment-id',
    createdAt: '2020-02-19T23:06:33.798Z',
    createdBy: { username: 'elastic' },
    pushedAt: null,
    pushedBy: null,
    updatedAt: null,
    updatedBy: null,
    version: 'WzQ3LDFc',
  },
];

describe('Case view helpers', () => {
  describe('getRuleIdsFromComments', () => {
    it('it returns the rules ids from the comments', () => {
      expect(getRuleIdsFromComments(comments)).toEqual(['alert-id-1', 'alert-id-2']);
    });
  });

  describe('buildAlertsQuery', () => {
    it('it builds the alerts query', () => {
      expect(buildAlertsQuery(['alert-id-1', 'alert-id-2'])).toEqual({
        query: {
          bool: {
            filter: {
              bool: {
                should: [{ match: { _id: 'alert-id-1' } }, { match: { _id: 'alert-id-2' } }],
                minimum_should_match: 1,
              },
            },
          },
        },
      });
    });
  });
});
