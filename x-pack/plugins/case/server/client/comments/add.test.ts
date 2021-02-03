/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { omit } from 'lodash/fp';
import { CommentType } from '../../../common/api';
import {
  createMockSavedObjectsRepository,
  mockCaseComments,
  mockCases,
} from '../../routes/api/__fixtures__';
import { createCaseClientWithMockSavedObjectsClient } from '../mocks';

describe('addComment', () => {
  beforeEach(async () => {
    jest.restoreAllMocks();
    const spyOnDate = jest.spyOn(global, 'Date') as jest.SpyInstance<{}, []>;
    spyOnDate.mockImplementation(() => ({
      toISOString: jest.fn().mockReturnValue('2020-10-23T21:54:48.952Z'),
    }));
  });

  describe('happy path', () => {
    test('it adds a comment correctly', async () => {
      const savedObjectsClient = createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
        caseCommentSavedObject: mockCaseComments,
      });

      const caseClient = await createCaseClientWithMockSavedObjectsClient({ savedObjectsClient });
      const res = await caseClient.client.addComment({
        caseClient: caseClient.client,
        caseId: 'mock-id-1',
        comment: {
          comment: 'Wow, good luck catching that bad meanie!',
          type: CommentType.user,
        },
      });

      expect(res.id).toEqual('mock-id-1');
      expect(res.totalComment).toEqual(res.comments!.length);
      expect(res.comments![res.comments!.length - 1]).toEqual({
        comment: 'Wow, good luck catching that bad meanie!',
        type: CommentType.user,
        created_at: '2020-10-23T21:54:48.952Z',
        created_by: {
          email: 'd00d@awesome.com',
          full_name: 'Awesome D00d',
          username: 'awesome',
        },
        id: 'mock-comment',
        pushed_at: null,
        pushed_by: null,
        updated_at: null,
        updated_by: null,
        version: 'WzksMV0=',
      });
    });

    test('it adds a comment of type alert correctly', async () => {
      const savedObjectsClient = createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
        caseCommentSavedObject: mockCaseComments,
      });

      const caseClient = await createCaseClientWithMockSavedObjectsClient({ savedObjectsClient });
      const res = await caseClient.client.addComment({
        caseClient: caseClient.client,
        caseId: 'mock-id-1',
        comment: {
          type: CommentType.alert,
          alertId: 'test-id',
          index: 'test-index',
        },
      });

      expect(res.id).toEqual('mock-id-1');
      expect(res.totalComment).toEqual(res.comments!.length);
      expect(res.comments![res.comments!.length - 1]).toEqual({
        type: CommentType.alert,
        alertId: 'test-id',
        index: 'test-index',
        created_at: '2020-10-23T21:54:48.952Z',
        created_by: {
          email: 'd00d@awesome.com',
          full_name: 'Awesome D00d',
          username: 'awesome',
        },
        id: 'mock-comment',
        pushed_at: null,
        pushed_by: null,
        updated_at: null,
        updated_by: null,
        version: 'WzksMV0=',
      });
    });

    test('it updates the case correctly after adding a comment', async () => {
      const savedObjectsClient = createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
        caseCommentSavedObject: mockCaseComments,
      });

      const caseClient = await createCaseClientWithMockSavedObjectsClient({ savedObjectsClient });
      const res = await caseClient.client.addComment({
        caseClient: caseClient.client,
        caseId: 'mock-id-1',
        comment: {
          comment: 'Wow, good luck catching that bad meanie!',
          type: CommentType.user,
        },
      });

      expect(res.updated_at).toEqual('2020-10-23T21:54:48.952Z');
      expect(res.updated_by).toEqual({
        email: 'd00d@awesome.com',
        full_name: 'Awesome D00d',
        username: 'awesome',
      });
    });

    test('it creates a user action', async () => {
      const savedObjectsClient = createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
        caseCommentSavedObject: mockCaseComments,
      });

      const caseClient = await createCaseClientWithMockSavedObjectsClient({ savedObjectsClient });
      await caseClient.client.addComment({
        caseClient: caseClient.client,
        caseId: 'mock-id-1',
        comment: {
          comment: 'Wow, good luck catching that bad meanie!',
          type: CommentType.user,
        },
      });

      expect(
        caseClient.services.userActionService.postUserActions.mock.calls[0][0].actions
      ).toEqual([
        {
          attributes: {
            action: 'create',
            action_at: '2020-10-23T21:54:48.952Z',
            action_by: {
              email: 'd00d@awesome.com',
              full_name: 'Awesome D00d',
              username: 'awesome',
            },
            action_field: ['comment'],
            new_value: '{"comment":"Wow, good luck catching that bad meanie!","type":"user"}',
            old_value: null,
          },
          references: [
            {
              id: 'mock-id-1',
              name: 'associated-cases',
              type: 'cases',
            },
            {
              id: 'mock-comment',
              name: 'associated-cases-comments',
              type: 'cases-comments',
            },
          ],
        },
      ]);
    });

    test('it allow user to create comments without authentications', async () => {
      const savedObjectsClient = createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
        caseCommentSavedObject: mockCaseComments,
      });

      const caseClient = await createCaseClientWithMockSavedObjectsClient({
        savedObjectsClient,
        badAuth: true,
      });
      const res = await caseClient.client.addComment({
        caseClient: caseClient.client,
        caseId: 'mock-id-1',
        comment: {
          comment: 'Wow, good luck catching that bad meanie!',
          type: CommentType.user,
        },
      });

      expect(res.id).toEqual('mock-id-1');
      expect(res.comments![res.comments!.length - 1]).toEqual({
        comment: 'Wow, good luck catching that bad meanie!',
        type: CommentType.user,
        created_at: '2020-10-23T21:54:48.952Z',
        created_by: {
          email: null,
          full_name: null,
          username: null,
        },
        id: 'mock-comment',
        pushed_at: null,
        pushed_by: null,
        updated_at: null,
        updated_by: null,
        version: 'WzksMV0=',
      });
    });

    test('it update the status of the alert if the case is synced with alerts', async () => {
      const savedObjectsClient = createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
        caseCommentSavedObject: mockCaseComments,
      });

      const caseClient = await createCaseClientWithMockSavedObjectsClient({
        savedObjectsClient,
        badAuth: true,
      });

      caseClient.client.updateAlertsStatus = jest.fn();

      await caseClient.client.addComment({
        caseClient: caseClient.client,
        caseId: 'mock-id-1',
        comment: {
          type: CommentType.alert,
          alertId: 'test-alert',
          index: 'test-index',
        },
      });

      expect(caseClient.client.updateAlertsStatus).toHaveBeenCalledWith({
        ids: ['test-alert'],
        status: 'open',
      });
    });

    test('it should NOT update the status of the alert if the case is NOT synced with alerts', async () => {
      const savedObjectsClient = createMockSavedObjectsRepository({
        caseSavedObject: [
          {
            ...mockCases[0],
            attributes: { ...mockCases[0].attributes, settings: { syncAlerts: false } },
          },
        ],
        caseCommentSavedObject: mockCaseComments,
      });

      const caseClient = await createCaseClientWithMockSavedObjectsClient({
        savedObjectsClient,
        badAuth: true,
      });

      caseClient.client.updateAlertsStatus = jest.fn();

      await caseClient.client.addComment({
        caseClient: caseClient.client,
        caseId: 'mock-id-1',
        comment: {
          type: CommentType.alert,
          alertId: 'test-alert',
          index: 'test-index',
        },
      });

      expect(caseClient.client.updateAlertsStatus).not.toHaveBeenCalled();
    });
  });

  describe('unhappy path', () => {
    test('it throws when missing type', async () => {
      expect.assertions(3);

      const savedObjectsClient = createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
        caseCommentSavedObject: mockCaseComments,
      });
      const caseClient = await createCaseClientWithMockSavedObjectsClient({ savedObjectsClient });
      caseClient.client
        .addComment({
          caseId: 'mock-id-1',
          // @ts-expect-error
          comment: {},
        })
        .catch((e) => {
          expect(e).not.toBeNull();
          expect(e.isBoom).toBe(true);
          expect(e.output.statusCode).toBe(400);
        });
    });

    test('it throws when missing attributes: type user', async () => {
      expect.assertions(3);

      const savedObjectsClient = createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
        caseCommentSavedObject: mockCaseComments,
      });

      const caseClient = await createCaseClientWithMockSavedObjectsClient({ savedObjectsClient });
      const allRequestAttributes = {
        type: CommentType.user,
        comment: 'a comment',
      };

      ['comment'].forEach((attribute) => {
        const requestAttributes = omit(attribute, allRequestAttributes);
        caseClient.client
          .addComment({
            caseId: 'mock-id-1',
            // @ts-expect-error
            comment: {
              ...requestAttributes,
            },
          })
          .catch((e) => {
            expect(e).not.toBeNull();
            expect(e.isBoom).toBe(true);
            expect(e.output.statusCode).toBe(400);
          });
      });
    });

    test('it throws when excess attributes are provided: type user', async () => {
      expect.assertions(6);

      const savedObjectsClient = createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
        caseCommentSavedObject: mockCaseComments,
      });

      const caseClient = await createCaseClientWithMockSavedObjectsClient({ savedObjectsClient });

      ['alertId', 'index'].forEach((attribute) => {
        caseClient.client
          .addComment({
            caseClient: caseClient.client,
            caseId: 'mock-id-1',
            comment: {
              [attribute]: attribute,
              comment: 'a comment',
              type: CommentType.user,
            },
          })
          .catch((e) => {
            expect(e).not.toBeNull();
            expect(e.isBoom).toBe(true);
            expect(e.output.statusCode).toBe(400);
          });
      });
    });

    test('it throws when missing attributes: type alert', async () => {
      expect.assertions(6);

      const savedObjectsClient = createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
        caseCommentSavedObject: mockCaseComments,
      });

      const caseClient = await createCaseClientWithMockSavedObjectsClient({ savedObjectsClient });
      const allRequestAttributes = {
        type: CommentType.alert,
        index: 'test-index',
        alertId: 'test-id',
      };

      ['alertId', 'index'].forEach((attribute) => {
        const requestAttributes = omit(attribute, allRequestAttributes);
        caseClient.client
          .addComment({
            caseId: 'mock-id-1',
            // @ts-expect-error
            comment: {
              ...requestAttributes,
            },
          })
          .catch((e) => {
            expect(e).not.toBeNull();
            expect(e.isBoom).toBe(true);
            expect(e.output.statusCode).toBe(400);
          });
      });
    });

    test('it throws when excess attributes are provided: type alert', async () => {
      expect.assertions(3);

      const savedObjectsClient = createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
        caseCommentSavedObject: mockCaseComments,
      });

      const caseClient = await createCaseClientWithMockSavedObjectsClient({ savedObjectsClient });

      ['comment'].forEach((attribute) => {
        caseClient.client
          .addComment({
            caseClient: caseClient.client,
            caseId: 'mock-id-1',
            comment: {
              [attribute]: attribute,
              type: CommentType.alert,
              index: 'test-index',
              alertId: 'test-id',
            },
          })
          .catch((e) => {
            expect(e).not.toBeNull();
            expect(e.isBoom).toBe(true);
            expect(e.output.statusCode).toBe(400);
          });
      });
    });

    test('it throws when the case does not exists', async () => {
      expect.assertions(3);

      const savedObjectsClient = createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
        caseCommentSavedObject: mockCaseComments,
      });
      const caseClient = await createCaseClientWithMockSavedObjectsClient({ savedObjectsClient });
      caseClient.client
        .addComment({
          caseClient: caseClient.client,
          caseId: 'not-exists',
          comment: {
            comment: 'Wow, good luck catching that bad meanie!',
            type: CommentType.user,
          },
        })
        .catch((e) => {
          expect(e).not.toBeNull();
          expect(e.isBoom).toBe(true);
          expect(e.output.statusCode).toBe(404);
        });
    });

    test('it throws when postNewCase throws', async () => {
      expect.assertions(3);

      const savedObjectsClient = createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
        caseCommentSavedObject: mockCaseComments,
      });
      const caseClient = await createCaseClientWithMockSavedObjectsClient({ savedObjectsClient });
      caseClient.client
        .addComment({
          caseClient: caseClient.client,
          caseId: 'mock-id-1',
          comment: {
            comment: 'Throw an error',
            type: CommentType.user,
          },
        })
        .catch((e) => {
          expect(e).not.toBeNull();
          expect(e.isBoom).toBe(true);
          expect(e.output.statusCode).toBe(400);
        });
    });

    test('it throws when the case is closed and the comment is of type alert', async () => {
      expect.assertions(3);

      const savedObjectsClient = createMockSavedObjectsRepository({
        caseSavedObject: mockCases,
        caseCommentSavedObject: mockCaseComments,
      });

      const caseClient = await createCaseClientWithMockSavedObjectsClient({ savedObjectsClient });
      caseClient.client
        .addComment({
          caseClient: caseClient.client,
          caseId: 'mock-id-4',
          comment: {
            type: CommentType.alert,
            alertId: 'test-alert',
            index: 'test-index',
          },
        })
        .catch((e) => {
          expect(e).not.toBeNull();
          expect(e.isBoom).toBe(true);
          expect(e.output.statusCode).toBe(400);
        });
    });
  });
});
