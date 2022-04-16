/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject, SavedObjectsFindResponse } from '@kbn/core/server';
import { makeLensEmbeddableFactory } from '@kbn/lens-plugin/server/embeddable/make_lens_embeddable_factory';
import { SECURITY_SOLUTION_OWNER } from '../../common/constants';
import {
  CaseResponse,
  CommentAttributes,
  CommentRequest,
  CommentRequestUserType,
  CommentType,
} from '../../common/api';
import { mockCaseComments, mockCases } from '../routes/api/__fixtures__/mock_saved_objects';
import {
  flattenCaseSavedObject,
  transformNewComment,
  countAlerts,
  countAlertsForID,
  groupTotalAlertsByID,
  transformCases,
  transformComments,
  flattenCommentSavedObjects,
  flattenCommentSavedObject,
  extractLensReferencesFromCommentString,
  getOrUpdateLensReferences,
  asArray,
} from './utils';

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
            createdDate: '',
          }),
        });
      }
    }
  }

  return resp;
}

describe('common utils', () => {
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
      expect(res).toMatchInlineSnapshot(`
        Object {
          "cases": Array [
            Object {
              "closed_at": null,
              "closed_by": null,
              "comments": Array [],
              "connector": Object {
                "fields": null,
                "id": "none",
                "name": "none",
                "type": ".none",
              },
              "created_at": "2019-11-25T21:54:48.952Z",
              "created_by": Object {
                "email": "testemail@elastic.co",
                "full_name": "elastic",
                "username": "elastic",
              },
              "description": "This is a brand new case of a bad meanie defacing data",
              "external_service": null,
              "id": "mock-id-1",
              "owner": "securitySolution",
              "settings": Object {
                "syncAlerts": true,
              },
              "status": "open",
              "tags": Array [
                "defacement",
              ],
              "title": "Super Bad Security Issue",
              "totalAlerts": 0,
              "totalComment": 2,
              "updated_at": "2019-11-25T21:54:48.952Z",
              "updated_by": Object {
                "email": "testemail@elastic.co",
                "full_name": "elastic",
                "username": "elastic",
              },
              "version": "WzAsMV0=",
            },
            Object {
              "closed_at": null,
              "closed_by": null,
              "comments": Array [],
              "connector": Object {
                "fields": null,
                "id": "none",
                "name": "none",
                "type": ".none",
              },
              "created_at": "2019-11-25T22:32:00.900Z",
              "created_by": Object {
                "email": "testemail@elastic.co",
                "full_name": "elastic",
                "username": "elastic",
              },
              "description": "Oh no, a bad meanie destroying data!",
              "external_service": null,
              "id": "mock-id-2",
              "owner": "securitySolution",
              "settings": Object {
                "syncAlerts": true,
              },
              "status": "open",
              "tags": Array [
                "Data Destruction",
              ],
              "title": "Damaging Data Destruction Detected",
              "totalAlerts": 0,
              "totalComment": 2,
              "updated_at": "2019-11-25T22:32:00.900Z",
              "updated_by": Object {
                "email": "testemail@elastic.co",
                "full_name": "elastic",
                "username": "elastic",
              },
              "version": "WzQsMV0=",
            },
            Object {
              "closed_at": null,
              "closed_by": null,
              "comments": Array [],
              "connector": Object {
                "fields": Object {
                  "issueType": "Task",
                  "parent": null,
                  "priority": "High",
                },
                "id": "123",
                "name": "My connector",
                "type": ".jira",
              },
              "created_at": "2019-11-25T22:32:17.947Z",
              "created_by": Object {
                "email": "testemail@elastic.co",
                "full_name": "elastic",
                "username": "elastic",
              },
              "description": "Oh no, a bad meanie going LOLBins all over the place!",
              "external_service": null,
              "id": "mock-id-3",
              "owner": "securitySolution",
              "settings": Object {
                "syncAlerts": true,
              },
              "status": "open",
              "tags": Array [
                "LOLBins",
              ],
              "title": "Another bad one",
              "totalAlerts": 0,
              "totalComment": 2,
              "updated_at": "2019-11-25T22:32:17.947Z",
              "updated_by": Object {
                "email": "testemail@elastic.co",
                "full_name": "elastic",
                "username": "elastic",
              },
              "version": "WzUsMV0=",
            },
            Object {
              "closed_at": "2019-11-25T22:32:17.947Z",
              "closed_by": Object {
                "email": "testemail@elastic.co",
                "full_name": "elastic",
                "username": "elastic",
              },
              "comments": Array [],
              "connector": Object {
                "fields": Object {
                  "issueType": "Task",
                  "parent": null,
                  "priority": "High",
                },
                "id": "123",
                "name": "My connector",
                "type": ".jira",
              },
              "created_at": "2019-11-25T22:32:17.947Z",
              "created_by": Object {
                "email": "testemail@elastic.co",
                "full_name": "elastic",
                "username": "elastic",
              },
              "description": "Oh no, a bad meanie going LOLBins all over the place!",
              "external_service": null,
              "id": "mock-id-4",
              "owner": "securitySolution",
              "settings": Object {
                "syncAlerts": true,
              },
              "status": "closed",
              "tags": Array [
                "LOLBins",
              ],
              "title": "Another bad one",
              "totalAlerts": 0,
              "totalComment": 2,
              "updated_at": "2019-11-25T22:32:17.947Z",
              "updated_by": Object {
                "email": "testemail@elastic.co",
                "full_name": "elastic",
                "username": "elastic",
              },
              "version": "WzUsMV0=",
            },
          ],
          "count_closed_cases": 2,
          "count_in_progress_cases": 2,
          "count_open_cases": 2,
          "page": 1,
          "per_page": 10,
          "total": 4,
        }
      `);
    });
  });

  describe('flattenCaseSavedObject', () => {
    it('flattens correctly', () => {
      const myCase = { ...mockCases[2] };
      const res = flattenCaseSavedObject({
        savedObject: myCase,
        totalComment: 2,
      });

      expect(res).toMatchInlineSnapshot(`
        Object {
          "closed_at": null,
          "closed_by": null,
          "comments": Array [],
          "connector": Object {
            "fields": Object {
              "issueType": "Task",
              "parent": null,
              "priority": "High",
            },
            "id": "123",
            "name": "My connector",
            "type": ".jira",
          },
          "created_at": "2019-11-25T22:32:17.947Z",
          "created_by": Object {
            "email": "testemail@elastic.co",
            "full_name": "elastic",
            "username": "elastic",
          },
          "description": "Oh no, a bad meanie going LOLBins all over the place!",
          "external_service": null,
          "id": "mock-id-3",
          "owner": "securitySolution",
          "settings": Object {
            "syncAlerts": true,
          },
          "status": "open",
          "tags": Array [
            "LOLBins",
          ],
          "title": "Another bad one",
          "totalAlerts": 0,
          "totalComment": 2,
          "updated_at": "2019-11-25T22:32:17.947Z",
          "updated_by": Object {
            "email": "testemail@elastic.co",
            "full_name": "elastic",
            "username": "elastic",
          },
          "version": "WzUsMV0=",
        }
      `);
    });

    it('flattens correctly without version', () => {
      const myCase = { ...mockCases[2] };
      myCase.version = undefined;
      const res = flattenCaseSavedObject({
        savedObject: myCase,
        totalComment: 2,
      });

      expect(res).toMatchInlineSnapshot(`
        Object {
          "closed_at": null,
          "closed_by": null,
          "comments": Array [],
          "connector": Object {
            "fields": Object {
              "issueType": "Task",
              "parent": null,
              "priority": "High",
            },
            "id": "123",
            "name": "My connector",
            "type": ".jira",
          },
          "created_at": "2019-11-25T22:32:17.947Z",
          "created_by": Object {
            "email": "testemail@elastic.co",
            "full_name": "elastic",
            "username": "elastic",
          },
          "description": "Oh no, a bad meanie going LOLBins all over the place!",
          "external_service": null,
          "id": "mock-id-3",
          "owner": "securitySolution",
          "settings": Object {
            "syncAlerts": true,
          },
          "status": "open",
          "tags": Array [
            "LOLBins",
          ],
          "title": "Another bad one",
          "totalAlerts": 0,
          "totalComment": 2,
          "updated_at": "2019-11-25T22:32:17.947Z",
          "updated_by": Object {
            "email": "testemail@elastic.co",
            "full_name": "elastic",
            "username": "elastic",
          },
          "version": "0",
        }
      `);
    });

    it('flattens correctly with comments', () => {
      const myCase = { ...mockCases[2] };
      const comments = [{ ...mockCaseComments[0] }];
      const res = flattenCaseSavedObject({
        savedObject: myCase,
        comments,
        totalComment: 2,
      });

      expect(res).toMatchInlineSnapshot(`
        Object {
          "closed_at": null,
          "closed_by": null,
          "comments": Array [
            Object {
              "comment": "Wow, good luck catching that bad meanie!",
              "created_at": "2019-11-25T21:55:00.177Z",
              "created_by": Object {
                "email": "testemail@elastic.co",
                "full_name": "elastic",
                "username": "elastic",
              },
              "id": "mock-comment-1",
              "owner": "securitySolution",
              "pushed_at": null,
              "pushed_by": null,
              "type": "user",
              "updated_at": "2019-11-25T21:55:00.177Z",
              "updated_by": Object {
                "email": "testemail@elastic.co",
                "full_name": "elastic",
                "username": "elastic",
              },
              "version": "WzEsMV0=",
            },
          ],
          "connector": Object {
            "fields": Object {
              "issueType": "Task",
              "parent": null,
              "priority": "High",
            },
            "id": "123",
            "name": "My connector",
            "type": ".jira",
          },
          "created_at": "2019-11-25T22:32:17.947Z",
          "created_by": Object {
            "email": "testemail@elastic.co",
            "full_name": "elastic",
            "username": "elastic",
          },
          "description": "Oh no, a bad meanie going LOLBins all over the place!",
          "external_service": null,
          "id": "mock-id-3",
          "owner": "securitySolution",
          "settings": Object {
            "syncAlerts": true,
          },
          "status": "open",
          "tags": Array [
            "LOLBins",
          ],
          "title": "Another bad one",
          "totalAlerts": 0,
          "totalComment": 2,
          "updated_at": "2019-11-25T22:32:17.947Z",
          "updated_by": Object {
            "email": "testemail@elastic.co",
            "full_name": "elastic",
            "username": "elastic",
          },
          "version": "WzUsMV0=",
        }
      `);
    });

    it('leaves the connector.id in the attributes', () => {
      const extraCaseData = {
        totalComment: 2,
      };

      const res = flattenCaseSavedObject({
        savedObject: mockCases[0],
        ...extraCaseData,
      });

      expect(res).toMatchInlineSnapshot(`
        Object {
          "closed_at": null,
          "closed_by": null,
          "comments": Array [],
          "connector": Object {
            "fields": null,
            "id": "none",
            "name": "none",
            "type": ".none",
          },
          "created_at": "2019-11-25T21:54:48.952Z",
          "created_by": Object {
            "email": "testemail@elastic.co",
            "full_name": "elastic",
            "username": "elastic",
          },
          "description": "This is a brand new case of a bad meanie defacing data",
          "external_service": null,
          "id": "mock-id-1",
          "owner": "securitySolution",
          "settings": Object {
            "syncAlerts": true,
          },
          "status": "open",
          "tags": Array [
            "defacement",
          ],
          "title": "Super Bad Security Issue",
          "totalAlerts": 0,
          "totalComment": 2,
          "updated_at": "2019-11-25T21:54:48.952Z",
          "updated_by": Object {
            "email": "testemail@elastic.co",
            "full_name": "elastic",
            "username": "elastic",
          },
          "version": "WzAsMV0=",
        }
      `);
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

  describe('transformNewComment', () => {
    it('transforms correctly', () => {
      const comment = {
        comment: 'A comment',
        type: CommentType.user as const,
        createdDate: '2020-04-09T09:43:51.778Z',
        email: 'elastic@elastic.co',
        full_name: 'Elastic',
        username: 'elastic',
        owner: SECURITY_SOLUTION_OWNER,
      };

      const res = transformNewComment(comment);
      expect(res).toMatchInlineSnapshot(`
        Object {
          "comment": "A comment",
          "created_at": "2020-04-09T09:43:51.778Z",
          "created_by": Object {
            "email": "elastic@elastic.co",
            "full_name": "Elastic",
            "username": "elastic",
          },
          "owner": "securitySolution",
          "pushed_at": null,
          "pushed_by": null,
          "type": "user",
          "updated_at": null,
          "updated_by": null,
        }
      `);
    });

    it('transform correctly without optional fields', () => {
      const comment = {
        comment: 'A comment',
        type: CommentType.user as const,
        createdDate: '2020-04-09T09:43:51.778Z',
        owner: SECURITY_SOLUTION_OWNER,
      };

      const res = transformNewComment(comment);

      expect(res).toMatchInlineSnapshot(`
        Object {
          "comment": "A comment",
          "created_at": "2020-04-09T09:43:51.778Z",
          "created_by": Object {
            "email": undefined,
            "full_name": undefined,
            "username": undefined,
          },
          "owner": "securitySolution",
          "pushed_at": null,
          "pushed_by": null,
          "type": "user",
          "updated_at": null,
          "updated_by": null,
        }
      `);
    });

    it('transform correctly with optional fields as null', () => {
      const comment = {
        comment: 'A comment',
        type: CommentType.user as const,
        createdDate: '2020-04-09T09:43:51.778Z',
        email: null,
        full_name: null,
        username: null,
        owner: SECURITY_SOLUTION_OWNER,
      };

      const res = transformNewComment(comment);

      expect(res).toMatchInlineSnapshot(`
        Object {
          "comment": "A comment",
          "created_at": "2020-04-09T09:43:51.778Z",
          "created_by": Object {
            "email": null,
            "full_name": null,
            "username": null,
          },
          "owner": "securitySolution",
          "pushed_at": null,
          "pushed_by": null,
          "type": "user",
          "updated_at": null,
          "updated_by": null,
        }
      `);
    });
  });

  describe('countAlerts', () => {
    it('returns 0 when no alerts are found', () => {
      expect(
        countAlerts(
          createCommentFindResponse([
            {
              ids: ['1'],
              comments: [{ comment: '', type: CommentType.user, owner: SECURITY_SOLUTION_OWNER }],
            },
          ]).saved_objects[0]
        )
      ).toBe(0);
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
                  owner: SECURITY_SOLUTION_OWNER,
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
                  owner: SECURITY_SOLUTION_OWNER,
                  type: CommentType.alert,
                  rule: {
                    id: 'rule-id-1',
                    name: 'rule-name-1',
                  },
                },
                {
                  comment: '',
                  owner: SECURITY_SOLUTION_OWNER,
                  type: CommentType.user,
                },
              ],
            },
          ]),
        })
      ).toEqual(new Map<string, number>([['1', 2]]));
    });

    it('returns a map with two entry, 2 alerts, and 0 alerts', () => {
      expect(
        groupTotalAlertsByID({
          comments: createCommentFindResponse([
            {
              ids: ['1'],
              comments: [
                {
                  owner: SECURITY_SOLUTION_OWNER,
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
                  owner: SECURITY_SOLUTION_OWNER,
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
                  owner: SECURITY_SOLUTION_OWNER,
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
                  owner: SECURITY_SOLUTION_OWNER,
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

  describe('extractLensReferencesFromCommentString', () => {
    it('extracts successfully', () => {
      const commentString = [
        '**Test**   ',
        'Amazingg!!!',
        '[asdasdasdasd](http://localhost:5601/moq/app/security/timelines?timeline=(id%3A%27e4362a60-f478-11eb-a4b0-ebefce184d8d%27%2CisOpen%3A!t))',
        '!{lens{"timeRange":{"from":"now-7d","to":"now","mode":"relative"},"attributes":{"title":"aaaa","type":"lens","visualizationType":"lnsXY","state":{"datasourceStates":{"indexpattern":{"layers":{"layer1":{"columnOrder":["col1","col2"],"columns":{"col2":{"dataType":"number","isBucketed":false,"label":"Count of records","operationType":"count","scale":"ratio","sourceField":"Records"},"col1":{"dataType":"date","isBucketed":true,"label":"@timestamp","operationType":"date_histogram","params":{"interval":"auto"},"scale":"interval","sourceField":"timestamp"}}}}}},"visualization":{"axisTitlesVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"fittingFunction":"None","gridlinesVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"layers":[{"accessors":["col2"],"layerId":"layer1","seriesType":"bar_stacked","xAccessor":"col1","yConfig":[{"forAccessor":"col2"}]}],"legend":{"isVisible":true,"position":"right"},"preferredSeriesType":"bar_stacked","tickLabelsVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"valueLabels":"hide","yRightExtent":{"mode":"full"}},"query":{"language":"kuery","query":""},"filters":[]},"references":[{"type":"index-pattern","id":"90943e30-9a47-11e8-b64d-95841ca0b246","name":"indexpattern-datasource-current-indexpattern"},{"type":"index-pattern","id":"90943e30-9a47-11e8-b64d-95841ca0b248","name":"indexpattern-datasource-layer-layer1"}]},"editMode":false}}',
        '!{lens{"timeRange":{"from":"now-7d","to":"now","mode":"relative"},"attributes":{"title":"aaaa","type":"lens","visualizationType":"lnsXY","state":{"datasourceStates":{"indexpattern":{"layers":{"layer1":{"columnOrder":["col1","col2"],"columns":{"col2":{"dataType":"number","isBucketed":false,"label":"Count of records","operationType":"count","scale":"ratio","sourceField":"Records"},"col1":{"dataType":"date","isBucketed":true,"label":"@timestamp","operationType":"date_histogram","params":{"interval":"auto"},"scale":"interval","sourceField":"timestamp"}}}}}},"visualization":{"axisTitlesVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"fittingFunction":"None","gridlinesVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"layers":[{"accessors":["col2"],"layerId":"layer1","seriesType":"bar_stacked","xAccessor":"col1","yConfig":[{"forAccessor":"col2"}]}],"legend":{"isVisible":true,"position":"right"},"preferredSeriesType":"bar_stacked","tickLabelsVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"valueLabels":"hide","yRightExtent":{"mode":"full"}},"query":{"language":"kuery","query":""},"filters":[]},"references":[{"type":"index-pattern","id":"90943e30-9a47-11e8-b64d-95841ca0b246","name":"indexpattern-datasource-current-indexpattern"},{"type":"index-pattern","id":"90943e30-9a47-11e8-b64d-95841ca0b247","name":"indexpattern-datasource-layer-layer1"}]},"editMode":false}}',
      ].join('\n\n');

      const extractedReferences = extractLensReferencesFromCommentString(
        makeLensEmbeddableFactory(() => ({}), {}),
        commentString
      );

      const expectedReferences = [
        {
          type: 'index-pattern',
          id: '90943e30-9a47-11e8-b64d-95841ca0b246',
          name: 'indexpattern-datasource-current-indexpattern',
        },
        {
          type: 'index-pattern',
          id: '90943e30-9a47-11e8-b64d-95841ca0b248',
          name: 'indexpattern-datasource-layer-layer1',
        },
        {
          type: 'index-pattern',
          id: '90943e30-9a47-11e8-b64d-95841ca0b247',
          name: 'indexpattern-datasource-layer-layer1',
        },
      ];

      expect(expectedReferences.length).toEqual(extractedReferences.length);
      expect(expectedReferences).toEqual(expect.arrayContaining(extractedReferences));
    });
  });

  describe('getOrUpdateLensReferences', () => {
    it('update references', () => {
      const currentCommentStringReferences = [
        [
          {
            type: 'index-pattern',
            id: '90943e30-9a47-11e8-b64d-95841ca0b246',
            name: 'indexpattern-datasource-current-indexpattern',
          },
          {
            type: 'index-pattern',
            id: '90943e30-9a47-11e8-b64d-95841ca0b248',
            name: 'indexpattern-datasource-layer-layer1',
          },
        ],
        [
          {
            type: 'index-pattern',
            id: '90943e30-9a47-11e8-b64d-95841ca0b246',
            name: 'indexpattern-datasource-current-indexpattern',
          },
          {
            type: 'index-pattern',
            id: '90943e30-9a47-11e8-b64d-95841ca0b248',
            name: 'indexpattern-datasource-layer-layer1',
          },
        ],
      ];
      const currentCommentString = [
        '**Test**   ',
        '[asdasdasdasd](http://localhost:5601/moq/app/security/timelines?timeline=(id%3A%27e4362a60-f478-11eb-a4b0-ebefce184d8d%27%2CisOpen%3A!t))',
        `!{lens{"timeRange":{"from":"now-7d","to":"now","mode":"relative"},"attributes":{"title":"aaaa","type":"lens","visualizationType":"lnsXY","state":{"datasourceStates":{"indexpattern":{"layers":{"layer1":{"columnOrder":["col1","col2"],"columns":{"col2":{"dataType":"number","isBucketed":false,"label":"Count of records","operationType":"count","scale":"ratio","sourceField":"Records"},"col1":{"dataType":"date","isBucketed":true,"label":"@timestamp","operationType":"date_histogram","params":{"interval":"auto"},"scale":"interval","sourceField":"timestamp"}}}}}},"visualization":{"axisTitlesVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"fittingFunction":"None","gridlinesVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"layers":[{"accessors":["col2"],"layerId":"layer1","seriesType":"bar_stacked","xAccessor":"col1","yConfig":[{"forAccessor":"col2"}]}],"legend":{"isVisible":true,"position":"right"},"preferredSeriesType":"bar_stacked","tickLabelsVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"valueLabels":"hide","yRightExtent":{"mode":"full"}},"query":{"language":"kuery","query":""},"filters":[]},"references":${JSON.stringify(
          currentCommentStringReferences[0]
        )}},"editMode":false}}`,
        `!{lens{"timeRange":{"from":"now-7d","to":"now","mode":"relative"},"attributes":{"title":"aaaa","type":"lens","visualizationType":"lnsXY","state":{"datasourceStates":{"indexpattern":{"layers":{"layer1":{"columnOrder":["col1","col2"],"columns":{"col2":{"dataType":"number","isBucketed":false,"label":"Count of records","operationType":"count","scale":"ratio","sourceField":"Records"},"col1":{"dataType":"date","isBucketed":true,"label":"@timestamp","operationType":"date_histogram","params":{"interval":"auto"},"scale":"interval","sourceField":"timestamp"}}}}}},"visualization":{"axisTitlesVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"fittingFunction":"None","gridlinesVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"layers":[{"accessors":["col2"],"layerId":"layer1","seriesType":"bar_stacked","xAccessor":"col1","yConfig":[{"forAccessor":"col2"}]}],"legend":{"isVisible":true,"position":"right"},"preferredSeriesType":"bar_stacked","tickLabelsVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"valueLabels":"hide","yRightExtent":{"mode":"full"}},"query":{"language":"kuery","query":""},"filters":[]},"references":${JSON.stringify(
          currentCommentStringReferences[1]
        )}},"editMode":false}}`,
      ].join('\n\n');
      const nonLensCurrentCommentReferences = [
        { type: 'case', id: '7b4be181-9646-41b8-b12d-faabf1bd9512', name: 'Test case' },
        {
          type: 'timeline',
          id: '0f847d31-9683-4ebd-92b9-454e3e39aec1',
          name: 'Test case timeline',
        },
      ];
      const currentCommentReferences = [
        ...currentCommentStringReferences.flat(),
        ...nonLensCurrentCommentReferences,
      ];
      const newCommentStringReferences = [
        {
          type: 'index-pattern',
          id: '90943e30-9a47-11e8-b64d-95841ca0b245',
          name: 'indexpattern-datasource-current-indexpattern',
        },
        {
          type: 'index-pattern',
          id: '90943e30-9a47-11e8-b64d-95841ca0b248',
          name: 'indexpattern-datasource-layer-layer1',
        },
      ];
      const newCommentString = [
        '**Test**   ',
        'Awmazingg!!!',
        '[asdasdasdasd](http://localhost:5601/moq/app/security/timelines?timeline=(id%3A%27e4362a60-f478-11eb-a4b0-ebefce184d8d%27%2CisOpen%3A!t))',
        `!{lens{"timeRange":{"from":"now-7d","to":"now","mode":"relative"},"attributes":{"title":"aaaa","type":"lens","visualizationType":"lnsXY","state":{"datasourceStates":{"indexpattern":{"layers":{"layer1":{"columnOrder":["col1","col2"],"columns":{"col2":{"dataType":"number","isBucketed":false,"label":"Count of records","operationType":"count","scale":"ratio","sourceField":"Records"},"col1":{"dataType":"date","isBucketed":true,"label":"@timestamp","operationType":"date_histogram","params":{"interval":"auto"},"scale":"interval","sourceField":"timestamp"}}}}}},"visualization":{"axisTitlesVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"fittingFunction":"None","gridlinesVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"layers":[{"accessors":["col2"],"layerId":"layer1","seriesType":"bar_stacked","xAccessor":"col1","yConfig":[{"forAccessor":"col2"}]}],"legend":{"isVisible":true,"position":"right"},"preferredSeriesType":"bar_stacked","tickLabelsVisibilitySettings":{"x":true,"yLeft":true,"yRight":true},"valueLabels":"hide","yRightExtent":{"mode":"full"}},"query":{"language":"kuery","query":""},"filters":[]},"references":${JSON.stringify(
          newCommentStringReferences
        )}},"editMode":false}}`,
      ].join('\n\n');

      const updatedReferences = getOrUpdateLensReferences(
        makeLensEmbeddableFactory(() => ({}), {}),
        newCommentString,
        {
          references: currentCommentReferences,
          attributes: {
            comment: currentCommentString,
          },
        } as SavedObject<CommentRequestUserType>
      );

      const expectedReferences = [
        ...nonLensCurrentCommentReferences,
        ...newCommentStringReferences,
      ];

      expect(expectedReferences.length).toEqual(updatedReferences.length);
      expect(expectedReferences).toEqual(expect.arrayContaining(updatedReferences));
    });
  });

  describe('asArray', () => {
    it('returns an empty array when the field is undefined', () => {
      expect(asArray(undefined)).toEqual([]);
    });

    it('returns an empty array when the field is null', () => {
      expect(asArray(null)).toEqual([]);
    });

    it('leaves the string array as is when it is already an array', () => {
      expect(asArray(['value'])).toEqual(['value']);
    });

    it('returns an array of one item when passed a string', () => {
      expect(asArray('value')).toEqual(['value']);
    });

    it('returns an array of one item when passed a number', () => {
      expect(asArray(100)).toEqual([100]);
    });
  });
});
