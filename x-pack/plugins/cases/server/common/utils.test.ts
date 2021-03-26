/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsFindResponse } from 'kibana/server';
import { AssociationType, CommentAttributes, CommentRequest, CommentType } from '../../common/api';
import { transformNewComment } from '../routes/api/utils';
import { countAlerts, countAlertsForID, groupTotalAlertsByID } from './utils';

interface CommentReference {
  ids: string[];
  comments: CommentRequest[];
}

function createCommentFindResponse(
  commentRequests: CommentReference[]
): SavedObjectsFindResponse<CommentAttributes> {
  const resp: SavedObjectsFindResponse<CommentAttributes> = {
    page: 0,
    per_page: 0,
    total: 0,
    saved_objects: [],
  };

  for (const { ids, comments } of commentRequests) {
    for (const id of ids) {
      for (const comment of comments) {
        resp.saved_objects.push({
          id: '',
          references: [{ id, type: '', name: '' }],
          score: 0,
          type: '',
          attributes: transformNewComment({
            ...comment,
            associationType: AssociationType.case,
            createdDate: '',
          }),
        });
      }
    }
  }

  return resp;
}

describe('common utils', () => {
  describe('countAlerts', () => {
    it('returns 0 when no alerts are found', () => {
      expect(
        countAlerts(
          createCommentFindResponse([
            { ids: ['1'], comments: [{ comment: '', type: CommentType.user }] },
          ]).saved_objects[0]
        )
      ).toBe(0);
    });

    it('returns 3 alerts for a single generated alert comment', () => {
      expect(
        countAlerts(
          createCommentFindResponse([
            {
              ids: ['1'],
              comments: [
                {
                  alertId: ['a', 'b', 'c'],
                  index: '',
                  type: CommentType.generatedAlert,
                  rule: {
                    id: 'rule-id-1',
                    name: 'rule-name-1',
                  },
                },
              ],
            },
          ]).saved_objects[0]
        )
      ).toBe(3);
    });

    it('returns 3 alerts for a single alert comment', () => {
      expect(
        countAlerts(
          createCommentFindResponse([
            {
              ids: ['1'],
              comments: [
                {
                  alertId: ['a', 'b', 'c'],
                  index: '',
                  type: CommentType.alert,
                  rule: {
                    id: 'rule-id-1',
                    name: 'rule-name-1',
                  },
                },
              ],
            },
          ]).saved_objects[0]
        )
      ).toBe(3);
    });
  });

  describe('groupTotalAlertsByID', () => {
    it('returns a map with one entry and 2 alerts', () => {
      expect(
        groupTotalAlertsByID({
          comments: createCommentFindResponse([
            {
              ids: ['1'],
              comments: [
                {
                  alertId: ['a', 'b'],
                  index: '',
                  type: CommentType.alert,
                  rule: {
                    id: 'rule-id-1',
                    name: 'rule-name-1',
                  },
                },
                {
                  comment: '',
                  type: CommentType.user,
                },
              ],
            },
          ]),
        })
      ).toEqual(
        new Map<string, number>([['1', 2]])
      );
    });

    it('returns a map with two entry, 2 alerts, and 0 alerts', () => {
      expect(
        groupTotalAlertsByID({
          comments: createCommentFindResponse([
            {
              ids: ['1'],
              comments: [
                {
                  alertId: ['a', 'b'],
                  index: '',
                  type: CommentType.alert,
                  rule: {
                    id: 'rule-id-1',
                    name: 'rule-name-1',
                  },
                },
              ],
            },
            {
              ids: ['2'],
              comments: [
                {
                  comment: '',
                  type: CommentType.user,
                },
              ],
            },
          ]),
        })
      ).toEqual(
        new Map<string, number>([
          ['1', 2],
          ['2', 0],
        ])
      );
    });

    it('returns a map with two entry, 2 alerts, and 2 alerts', () => {
      expect(
        groupTotalAlertsByID({
          comments: createCommentFindResponse([
            {
              ids: ['1', '2'],
              comments: [
                {
                  alertId: ['a', 'b'],
                  index: '',
                  type: CommentType.alert,
                  rule: {
                    id: 'rule-id-1',
                    name: 'rule-name-1',
                  },
                },
              ],
            },
          ]),
        })
      ).toEqual(
        new Map<string, number>([
          ['1', 2],
          ['2', 2],
        ])
      );
    });
  });

  describe('countAlertsForID', () => {
    it('returns 2 alerts for id 1 when the map has multiple entries', () => {
      expect(
        countAlertsForID({
          id: '1',
          comments: createCommentFindResponse([
            {
              ids: ['1', '2'],
              comments: [
                {
                  alertId: ['a', 'b'],
                  index: '',
                  type: CommentType.alert,
                  rule: {
                    id: 'rule-id-1',
                    name: 'rule-name-1',
                  },
                },
              ],
            },
          ]),
        })
      ).toEqual(2);
    });
  });
});
