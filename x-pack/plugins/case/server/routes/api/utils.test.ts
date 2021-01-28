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
import { isBoom, boomify } from '@hapi/boom';
import {
  mockCases,
  mockCaseComments,
  mockCaseNoConnectorId,
} from './__fixtures__/mock_saved_objects';
import {
  ConnectorTypes,
  ESCaseConnector,
  CommentType,
  CaseStatuses,
  AssociationType,
  CaseType,
  CaseResponse,
} from '../../../common/api';

describe('Utils', () => {
  describe('transformNewCase', () => {
    const connector: ESCaseConnector = {
      id: '123',
      name: 'My connector',
      type: ConnectorTypes.jira,
      fields: [
        { key: 'issueType', value: 'Task' },
        { key: 'priority', value: 'High' },
        { key: 'parent', value: null },
      ],
    };
    it('transform correctly', () => {
      const myCase = {
        newCase: { ...newCase, type: CaseType.individual },
        connector,
        createdDate: '2020-04-09T09:43:51.778Z',
        email: 'elastic@elastic.co',
        full_name: 'Elastic',
        username: 'elastic',
      };

      const res = transformNewCase(myCase);

      expect(res).toMatchSnapshot();
    });

    it('transform correctly without optional fields', () => {
      const myCase = {
        newCase: { ...newCase, type: CaseType.individual },
        connector,
        createdDate: '2020-04-09T09:43:51.778Z',
      };

      const res = transformNewCase(myCase);

      expect(res).toMatchSnapshot();
    });

    it('transform correctly with optional fields as null', () => {
      const myCase = {
        newCase: { ...newCase, type: CaseType.individual },
        connector,
        createdDate: '2020-04-09T09:43:51.778Z',
        email: null,
        full_name: null,
        username: null,
      };

      const res = transformNewCase(myCase);

      expect(res).toMatchSnapshot();
    });
  });

  describe('transformNewComment', () => {
    it('transforms correctly', () => {
      const comment = {
        comment: 'A comment',
        type: CommentType.user as const,
        createdDate: '2020-04-09T09:43:51.778Z',
        email: 'elastic@elastic.co',
        full_name: 'Elastic',
        username: 'elastic',
        associationType: AssociationType.case,
      };

      const res = transformNewComment(comment);
      expect(res).toMatchSnapshot();
    });

    it('transform correctly without optional fields', () => {
      const comment = {
        comment: 'A comment',
        type: CommentType.user as const,
        createdDate: '2020-04-09T09:43:51.778Z',
        associationType: AssociationType.case,
      };

      const res = transformNewComment(comment);

      expect(res).toMatchSnapshot();
    });

    it('transform correctly with optional fields as null', () => {
      const comment = {
        comment: 'A comment',
        type: CommentType.user as const,
        createdDate: '2020-04-09T09:43:51.778Z',
        email: null,
        full_name: null,
        username: null,
        associationType: AssociationType.case,
      };

      const res = transformNewComment(comment);

      expect(res).toMatchSnapshot();
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
      const casesMap = new Map<string, CaseResponse>(
        mockCases.map((obj) => {
          return [obj.id, flattenCaseSavedObject({ savedObject: obj, totalComment: 2 })];
        })
      );
      const res = transformCases({
        casesMap,
        countOpenCases: 2,
        countInProgressCases: 2,
        countClosedCases: 2,
        page: 1,
        perPage: 10,
        total: casesMap.size,
      });
      expect(res).toMatchSnapshot();
    });
  });

  // TODO: remove these
  describe('flattenCaseSavedObjects', () => {
    it('flattens correctly', () => {
      const extraCaseData = [{ caseId: mockCases[0].id, totalComments: 2 }];

      const res = flattenCaseSavedObjects([mockCases[0]], extraCaseData);

      expect(res).toMatchSnapshot();
    });

    it('it handles total comments correctly when caseId is not in extraCaseData', () => {
      const extraCaseData = [{ caseId: mockCases[0].id, totalComments: 0 }];
      const res = flattenCaseSavedObjects([mockCases[0]], extraCaseData);

      expect(res).toMatchSnapshot();
    });

    it('inserts missing connector', () => {
      const extraCaseData = [
        {
          caseId: mockCaseNoConnectorId.id,
          totalComment: 0,
        },
      ];

      // @ts-ignore this is to update old case saved objects to include connector
      const res = flattenCaseSavedObjects([mockCaseNoConnectorId], extraCaseData);

      expect(res).toMatchSnapshot();
    });
  });

  describe('flattenCaseSavedObject', () => {
    it('flattens correctly', () => {
      const myCase = { ...mockCases[2] };
      const res = flattenCaseSavedObject({
        savedObject: myCase,
        totalComment: 2,
      });

      expect(res).toMatchSnapshot();
    });

    it('flattens correctly without version', () => {
      const myCase = { ...mockCases[2] };
      myCase.version = undefined;
      const res = flattenCaseSavedObject({
        savedObject: myCase,
        totalComment: 2,
      });

      expect(res).toMatchSnapshot();
    });

    it('flattens correctly with comments', () => {
      const myCase = { ...mockCases[2] };
      const comments = [{ ...mockCaseComments[0] }];
      const res = flattenCaseSavedObject({
        savedObject: myCase,
        comments,
        totalComment: 2,
      });

      expect(res).toMatchSnapshot();
    });

    it('inserts missing connector', () => {
      const extraCaseData = {
        totalComment: 2,
      };

      const res = flattenCaseSavedObject({
        // @ts-ignore this is to update old case saved objects to include connector
        savedObject: mockCaseNoConnectorId,
        ...extraCaseData,
      });

      expect(res).toMatchSnapshot();
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
