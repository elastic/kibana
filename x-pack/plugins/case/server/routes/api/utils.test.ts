/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  transformNewCase,
  transformNewComment,
  wrapError,
  transformCases,
  flattenCaseSavedObjects,
  flattenCaseSavedObject,
  flattenCommentSavedObjects,
  transformComments,
  flattenCommentSavedObject,
  sortToSnake,
} from './utils';
import { newCase } from './__mocks__/request_responses';
import { isBoom, boomify } from 'boom';
import {
  mockCases,
  mockCaseComments,
  mockCaseNoConnectorId,
} from './__fixtures__/mock_saved_objects';

describe('Utils', () => {
  describe('transformNewCase', () => {
    it('transform correctly', () => {
      const myCase = {
        newCase,
        connectorId: '123',
        createdDate: '2020-04-09T09:43:51.778Z',
        email: 'elastic@elastic.co',
        full_name: 'Elastic',
        username: 'elastic',
      };

      const res = transformNewCase(myCase);

      expect(res).toEqual({
        ...myCase.newCase,
        closed_at: null,
        closed_by: null,
        connector_id: '123',
        created_at: '2020-04-09T09:43:51.778Z',
        created_by: { email: 'elastic@elastic.co', full_name: 'Elastic', username: 'elastic' },
        external_service: null,
        status: 'open',
        updated_at: null,
        updated_by: null,
      });
    });

    it('transform correctly without optional fields', () => {
      const myCase = {
        newCase,
        connectorId: '123',
        createdDate: '2020-04-09T09:43:51.778Z',
      };

      const res = transformNewCase(myCase);

      expect(res).toEqual({
        ...myCase.newCase,
        closed_at: null,
        closed_by: null,
        connector_id: '123',
        created_at: '2020-04-09T09:43:51.778Z',
        created_by: { email: undefined, full_name: undefined, username: undefined },
        external_service: null,
        status: 'open',
        updated_at: null,
        updated_by: null,
      });
    });

    it('transform correctly with optional fields as null', () => {
      const myCase = {
        newCase,
        connectorId: '123',
        createdDate: '2020-04-09T09:43:51.778Z',
        email: null,
        full_name: null,
        username: null,
      };

      const res = transformNewCase(myCase);

      expect(res).toEqual({
        ...myCase.newCase,
        closed_at: null,
        closed_by: null,
        connector_id: '123',
        created_at: '2020-04-09T09:43:51.778Z',
        created_by: { email: null, full_name: null, username: null },
        external_service: null,
        status: 'open',
        updated_at: null,
        updated_by: null,
      });
    });
  });

  describe('transformNewComment', () => {
    it('transforms correctly', () => {
      const comment = {
        comment: 'A comment',
        createdDate: '2020-04-09T09:43:51.778Z',
        email: 'elastic@elastic.co',
        full_name: 'Elastic',
        username: 'elastic',
      };

      const res = transformNewComment(comment);
      expect(res).toEqual({
        comment: 'A comment',
        created_at: '2020-04-09T09:43:51.778Z',
        created_by: { email: 'elastic@elastic.co', full_name: 'Elastic', username: 'elastic' },
        pushed_at: null,
        pushed_by: null,
        updated_at: null,
        updated_by: null,
      });
    });

    it('transform correctly without optional fields', () => {
      const comment = {
        comment: 'A comment',
        createdDate: '2020-04-09T09:43:51.778Z',
      };

      const res = transformNewComment(comment);

      expect(res).toEqual({
        comment: 'A comment',
        created_at: '2020-04-09T09:43:51.778Z',
        created_by: { email: undefined, full_name: undefined, username: undefined },
        pushed_at: null,
        pushed_by: null,
        updated_at: null,
        updated_by: null,
      });
    });

    it('transform correctly with optional fields as null', () => {
      const comment = {
        comment: 'A comment',
        createdDate: '2020-04-09T09:43:51.778Z',
        email: null,
        full_name: null,
        username: null,
      };

      const res = transformNewComment(comment);

      expect(res).toEqual({
        comment: 'A comment',
        created_at: '2020-04-09T09:43:51.778Z',
        created_by: { email: null, full_name: null, username: null },
        pushed_at: null,
        pushed_by: null,
        updated_at: null,
        updated_by: null,
      });
    });
  });

  describe('wrapError', () => {
    it('wraps an error', () => {
      const error = new Error('Something happened');
      const res = wrapError(error);

      expect(isBoom(res.body as Error)).toBe(true);
    });

    it('it set statusCode to 500', () => {
      const error = new Error('Something happened');
      const res = wrapError(error);

      expect(res.statusCode).toBe(500);
    });

    it('it set statusCode to errors status code', () => {
      const error = new Error('Something happened') as any;
      error.statusCode = 404;
      const res = wrapError(error);

      expect(res.statusCode).toBe(404);
    });

    it('it accepts a boom error', () => {
      const error = boomify(new Error('Something happened'));
      const res = wrapError(error);

      // Utils returns the same boom error as body
      expect(res.body).toBe(error);
    });

    it('it accepts a boom error with status code', () => {
      const error = boomify(new Error('Something happened'), { statusCode: 404 });
      const res = wrapError(error);

      expect(res.statusCode).toBe(404);
    });

    it('it returns empty headers', () => {
      const error = new Error('Something happened');
      const res = wrapError(error);

      expect(res.headers).toEqual({});
    });
  });

  describe('transformCases', () => {
    it('transforms correctly', () => {
      const extraCaseData = [
        { caseId: mockCases[0].id, totalComments: 2 },
        { caseId: mockCases[1].id, totalComments: 2 },
        { caseId: mockCases[2].id, totalComments: 2 },
        { caseId: mockCases[3].id, totalComments: 2 },
      ];

      const res = transformCases(
        {
          saved_objects: mockCases.map((obj) => ({ ...obj, score: 1 })),
          total: mockCases.length,
          per_page: 10,
          page: 1,
        },
        2,
        2,
        extraCaseData,
        '123'
      );
      expect(res).toEqual({
        page: 1,
        per_page: 10,
        total: mockCases.length,
        cases: flattenCaseSavedObjects(
          mockCases.map((obj) => ({ ...obj, score: 1 })),
          extraCaseData,
          '123'
        ),
        count_open_cases: 2,
        count_closed_cases: 2,
      });
    });
  });

  describe('flattenCaseSavedObjects', () => {
    it('flattens correctly', () => {
      const extraCaseData = [{ caseId: mockCases[0].id, totalComments: 2 }];

      const res = flattenCaseSavedObjects([mockCases[0]], extraCaseData, '123');
      expect(res).toEqual([
        {
          id: 'mock-id-1',
          closed_at: null,
          closed_by: null,
          connector_id: 'none',
          created_at: '2019-11-25T21:54:48.952Z',
          created_by: {
            full_name: 'elastic',
            email: 'testemail@elastic.co',
            username: 'elastic',
          },
          description: 'This is a brand new case of a bad meanie defacing data',
          external_service: null,
          title: 'Super Bad Security Issue',
          status: 'open',
          tags: ['defacement'],
          updated_at: '2019-11-25T21:54:48.952Z',
          updated_by: {
            full_name: 'elastic',
            email: 'testemail@elastic.co',
            username: 'elastic',
          },
          comments: [],
          totalComment: 2,
          version: 'WzAsMV0=',
        },
      ]);
    });

    it('it handles total comments correctly when caseId is not in extraCaseData', () => {
      const extraCaseData = [{ caseId: mockCases[0].id, totalComments: 0 }];
      const res = flattenCaseSavedObjects([mockCases[0]], extraCaseData, '123');

      expect(res).toEqual([
        {
          id: 'mock-id-1',
          closed_at: null,
          closed_by: null,
          connector_id: 'none',
          created_at: '2019-11-25T21:54:48.952Z',
          created_by: {
            full_name: 'elastic',
            email: 'testemail@elastic.co',
            username: 'elastic',
          },
          description: 'This is a brand new case of a bad meanie defacing data',
          external_service: null,
          title: 'Super Bad Security Issue',
          status: 'open',
          tags: ['defacement'],
          updated_at: '2019-11-25T21:54:48.952Z',
          updated_by: {
            full_name: 'elastic',
            email: 'testemail@elastic.co',
            username: 'elastic',
          },
          comments: [],
          totalComment: 0,
          version: 'WzAsMV0=',
        },
      ]);
    });
    it('inserts missing connectorId', () => {
      const extraCaseData = [
        {
          caseId: mockCaseNoConnectorId.id,
          totalComment: 0,
        },
      ];

      // @ts-ignore this is to update old case saved objects to include connector_id
      const res = flattenCaseSavedObjects([mockCaseNoConnectorId], extraCaseData, '123');
      expect(res).toEqual([
        {
          id: mockCaseNoConnectorId.id,
          closed_at: null,
          closed_by: null,
          connector_id: '123',
          created_at: '2019-11-25T21:54:48.952Z',
          created_by: {
            full_name: 'elastic',
            email: 'testemail@elastic.co',
            username: 'elastic',
          },
          description: 'This is a brand new case of a bad meanie defacing data',
          external_service: null,
          title: 'Super Bad Security Issue',
          status: 'open',
          tags: ['defacement'],
          updated_at: '2019-11-25T21:54:48.952Z',
          updated_by: {
            full_name: 'elastic',
            email: 'testemail@elastic.co',
            username: 'elastic',
          },
          comments: [],
          totalComment: 0,
          version: 'WzAsMV0=',
        },
      ]);
    });
    it('inserts missing connectorId (none)', () => {
      const extraCaseData = [
        {
          caseId: mockCaseNoConnectorId.id,
          totalComment: 0,
        },
      ];

      // @ts-ignore this is to update old case saved objects to include connector_id
      const res = flattenCaseSavedObjects([mockCaseNoConnectorId], extraCaseData);
      expect(res).toEqual([
        {
          id: mockCaseNoConnectorId.id,
          closed_at: null,
          closed_by: null,
          connector_id: 'none',
          created_at: '2019-11-25T21:54:48.952Z',
          created_by: {
            full_name: 'elastic',
            email: 'testemail@elastic.co',
            username: 'elastic',
          },
          description: 'This is a brand new case of a bad meanie defacing data',
          external_service: null,
          title: 'Super Bad Security Issue',
          status: 'open',
          tags: ['defacement'],
          updated_at: '2019-11-25T21:54:48.952Z',
          updated_by: {
            full_name: 'elastic',
            email: 'testemail@elastic.co',
            username: 'elastic',
          },
          comments: [],
          totalComment: 0,
          version: 'WzAsMV0=',
        },
      ]);
    });
  });

  describe('flattenCaseSavedObject', () => {
    it('flattens correctly', () => {
      const myCase = { ...mockCases[0] };
      const res = flattenCaseSavedObject({ savedObject: myCase, totalComment: 2 });
      expect(res).toEqual({
        id: myCase.id,
        version: myCase.version,
        comments: [],
        totalComment: 2,
        ...myCase.attributes,
      });
    });

    it('flattens correctly without version', () => {
      const myCase = { ...mockCases[0] };
      myCase.version = undefined;
      const res = flattenCaseSavedObject({ savedObject: myCase, totalComment: 2 });
      expect(res).toEqual({
        id: myCase.id,
        version: '0',
        comments: [],
        totalComment: 2,
        ...myCase.attributes,
      });
    });

    it('flattens correctly with comments', () => {
      const myCase = { ...mockCases[0] };
      const comments = [{ ...mockCaseComments[0] }];
      const res = flattenCaseSavedObject({ savedObject: myCase, comments, totalComment: 2 });
      expect(res).toEqual({
        id: myCase.id,
        version: myCase.version,
        comments: flattenCommentSavedObjects(comments),
        totalComment: 2,
        ...myCase.attributes,
      });
    });
    it('inserts missing connectorId', () => {
      const extraCaseData = {
        totalComment: 2,
        caseConfigureConnectorId: '123',
      };

      // @ts-ignore this is to update old case saved objects to include connector_id
      const res = flattenCaseSavedObject({ savedObject: mockCaseNoConnectorId, ...extraCaseData });
      expect(res).toEqual({
        id: mockCaseNoConnectorId.id,
        closed_at: null,
        closed_by: null,
        connector_id: '123',
        created_at: '2019-11-25T21:54:48.952Z',
        created_by: {
          full_name: 'elastic',
          email: 'testemail@elastic.co',
          username: 'elastic',
        },
        description: 'This is a brand new case of a bad meanie defacing data',
        external_service: null,
        title: 'Super Bad Security Issue',
        status: 'open',
        tags: ['defacement'],
        updated_at: '2019-11-25T21:54:48.952Z',
        updated_by: {
          full_name: 'elastic',
          email: 'testemail@elastic.co',
          username: 'elastic',
        },
        comments: [],
        totalComment: 2,
        version: 'WzAsMV0=',
      });
    });
    it('inserts missing connectorId (none)', () => {
      const extraCaseData = {
        totalComment: 2,
        caseConfigureConnectorId: 'none',
      };

      // @ts-ignore this is to update old case saved objects to include connector_id
      const res = flattenCaseSavedObject({ savedObject: mockCaseNoConnectorId, ...extraCaseData });
      expect(res).toEqual({
        id: mockCaseNoConnectorId.id,
        closed_at: null,
        closed_by: null,
        connector_id: 'none',
        created_at: '2019-11-25T21:54:48.952Z',
        created_by: {
          full_name: 'elastic',
          email: 'testemail@elastic.co',
          username: 'elastic',
        },
        description: 'This is a brand new case of a bad meanie defacing data',
        external_service: null,
        title: 'Super Bad Security Issue',
        status: 'open',
        tags: ['defacement'],
        updated_at: '2019-11-25T21:54:48.952Z',
        updated_by: {
          full_name: 'elastic',
          email: 'testemail@elastic.co',
          username: 'elastic',
        },
        comments: [],
        totalComment: 2,
        version: 'WzAsMV0=',
      });
    });
  });

  describe('transformComments', () => {
    it('transforms correctly', () => {
      const comments = {
        saved_objects: mockCaseComments.map((obj) => ({ ...obj, score: 1 })),
        total: mockCaseComments.length,
        per_page: 10,
        page: 1,
      };

      const res = transformComments(comments);
      expect(res).toEqual({
        page: 1,
        per_page: 10,
        total: mockCaseComments.length,
        comments: flattenCommentSavedObjects(comments.saved_objects),
      });
    });
  });

  describe('flattenCommentSavedObjects', () => {
    it('flattens correctly', () => {
      const comments = [{ ...mockCaseComments[0] }, { ...mockCaseComments[1] }];
      const res = flattenCommentSavedObjects(comments);
      expect(res).toEqual([
        flattenCommentSavedObject(comments[0]),
        flattenCommentSavedObject(comments[1]),
      ]);
    });
  });

  describe('flattenCommentSavedObject', () => {
    it('flattens correctly', () => {
      const comment = { ...mockCaseComments[0] };
      const res = flattenCommentSavedObject(comment);
      expect(res).toEqual({
        id: comment.id,
        version: comment.version,
        ...comment.attributes,
      });
    });

    it('flattens correctly without version', () => {
      const comment = { ...mockCaseComments[0] };
      comment.version = undefined;
      const res = flattenCommentSavedObject(comment);
      expect(res).toEqual({
        id: comment.id,
        version: '0',
        ...comment.attributes,
      });
    });
  });

  describe('sortToSnake', () => {
    it('it transforms status correctly', () => {
      expect(sortToSnake('status')).toBe('status');
    });

    it('it transforms createdAt correctly', () => {
      expect(sortToSnake('createdAt')).toBe('created_at');
    });

    it('it transforms created_at correctly', () => {
      expect(sortToSnake('created_at')).toBe('created_at');
    });

    it('it transforms closedAt correctly', () => {
      expect(sortToSnake('closedAt')).toBe('closed_at');
    });

    it('it transforms closed_at correctly', () => {
      expect(sortToSnake('closed_at')).toBe('closed_at');
    });

    it('it transforms default correctly', () => {
      expect(sortToSnake('not-exist')).toBe('created_at');
    });
  });
});
