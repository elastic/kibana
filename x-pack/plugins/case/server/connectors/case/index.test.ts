/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger } from '../../../../../../src/core/server';
import { loggingSystemMock } from '../../../../../../src/core/server/mocks';
import { actionsMock } from '../../../../actions/server/mocks';
import { validateParams } from '../../../../actions/server/lib';
import { ConnectorTypes } from '../../../common/api';
import {
  createCaseServiceMock,
  createConfigureServiceMock,
  createUserActionServiceMock,
} from '../../services/mocks';
import { CaseActionType, CaseActionTypeExecutorOptions, CaseExecutorParams } from './types';
import { getActionType } from '.';
import { createCaseClientMock } from '../../client/mocks';

const mockCaseClient = createCaseClientMock();

jest.mock('../../client', () => ({
  createCaseClient: () => mockCaseClient,
}));

const services = actionsMock.createServices();
let caseActionType: CaseActionType;

describe('case connector', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    const logger = loggingSystemMock.create().get() as jest.Mocked<Logger>;
    const caseService = createCaseServiceMock();
    const caseConfigureService = createConfigureServiceMock();
    const userActionService = createUserActionServiceMock();
    caseActionType = getActionType({
      logger,
      caseService,
      caseConfigureService,
      userActionService,
    });
  });

  describe('params validation', () => {
    describe('create', () => {
      it('succeeds when params is valid', () => {
        const params: Record<string, unknown> = {
          subAction: 'create',
          subActionParams: {
            title: 'Case from case connector!!',
            tags: ['case', 'connector'],
            description: 'Yo fields!!',
          },
        };

        expect(validateParams(caseActionType, params)).toEqual(params);
      });

      it('fails when params is not valid', () => {
        const params: Record<string, unknown> = {
          subAction: 'create',
        };

        expect(() => {
          validateParams(caseActionType, params);
        }).toThrow();
      });
    });

    describe('update', () => {
      it('succeeds when params is valid', () => {
        const params: Record<string, unknown> = {
          subAction: 'update',
          subActionParams: {
            id: 'case-id',
            version: '123',
            title: 'Update title',
          },
        };

        expect(validateParams(caseActionType, params)).toEqual({
          ...params,
          subActionParams: {
            description: null,
            tags: null,
            title: null,
            status: null,
            ...(params.subActionParams as Record<string, unknown>),
          },
        });
      });

      it('fails when params is not valid', () => {
        const params: Record<string, unknown> = {
          subAction: 'update',
        };

        expect(() => {
          validateParams(caseActionType, params);
        }).toThrow();
      });
    });

    describe('add comment', () => {
      it('succeeds when params is valid', () => {
        const params: Record<string, unknown> = {
          subAction: 'addComment',
          subActionParams: {
            caseId: 'case-id',
            comment: { comment: 'a comment', type: 'user' },
          },
        };

        expect(validateParams(caseActionType, params)).toEqual(params);
      });

      it('fails when params is not valid', () => {
        const params: Record<string, unknown> = {
          subAction: 'addComment',
        };

        expect(() => {
          validateParams(caseActionType, params);
        }).toThrow();
      });
    });
  });

  describe('execute', () => {
    it('allows only supported sub-actions', async () => {
      expect.assertions(2);
      const actionId = 'some-id';
      const params: CaseExecutorParams = {
        // @ts-expect-error
        subAction: 'not-supported',
        // @ts-expect-error
        subActionParams: {},
      };

      const executorOptions: CaseActionTypeExecutorOptions = {
        actionId,
        config: {},
        params,
        secrets: {},
        services,
      };

      caseActionType.executor(executorOptions).catch((e) => {
        expect(e).not.toBeNull();
        expect(e.message).toBe('[Action][Case] subAction not-supported not implemented.');
      });
    });

    describe('create', () => {
      it('executes correctly', async () => {
        const createReturn = {
          id: 'mock-it',
          comments: [],
          totalComment: 0,
          closed_at: null,
          closed_by: null,
          connector: { id: 'none', name: 'none', type: ConnectorTypes.none, fields: null },
          created_at: '2019-11-25T21:54:48.952Z',
          created_by: {
            full_name: 'Awesome D00d',
            email: 'd00d@awesome.com',
            username: 'awesome',
          },
          title: 'Case from case connector!!',
          tags: ['case', 'connector'],
          description: 'Yo fields!!',
          external_service: null,
          status: 'open' as const,
          updated_at: null,
          updated_by: null,
          version: 'WzksMV0=',
        };

        mockCaseClient.create.mockReturnValue(Promise.resolve(createReturn));

        const actionId = 'some-id';
        const params: CaseExecutorParams = {
          subAction: 'create',
          subActionParams: {
            title: 'Case from case connector!!',
            tags: ['case', 'connector'],
            description: 'Yo fields!!',
          },
        };

        const executorOptions: CaseActionTypeExecutorOptions = {
          actionId,
          config: {},
          params,
          secrets: {},
          services,
        };

        const result = await caseActionType.executor(executorOptions);

        expect(result).toEqual({ actionId, status: 'ok', data: createReturn });
        expect(mockCaseClient.create).toHaveBeenCalledWith({
          theCase: {
            ...params.subActionParams,
            connector: {
              fields: null,
              id: 'none',
              name: 'none',
              type: '.none',
            },
          },
        });
      });
    });

    describe('update', () => {
      it('executes correctly', async () => {
        const updateReturn = [
          {
            closed_at: '2019-11-25T21:54:48.952Z',
            closed_by: {
              email: 'd00d@awesome.com',
              full_name: 'Awesome D00d',
              username: 'awesome',
            },
            comments: [],
            connector: {
              id: 'none',
              name: 'none',
              type: ConnectorTypes.none,
              fields: null,
            },
            created_at: '2019-11-25T21:54:48.952Z',
            created_by: {
              email: 'testemail@elastic.co',
              full_name: 'elastic',
              username: 'elastic',
            },
            description: 'This is a brand new case of a bad meanie defacing data',
            id: 'mock-id-1',
            external_service: null,
            status: 'open' as const,
            tags: ['defacement'],
            title: 'Update title',
            totalComment: 0,
            updated_at: '2019-11-25T21:54:48.952Z',
            updated_by: {
              email: 'd00d@awesome.com',
              full_name: 'Awesome D00d',
              username: 'awesome',
            },
            version: 'WzE3LDFd',
          },
        ];

        mockCaseClient.update.mockReturnValue(Promise.resolve(updateReturn));

        const actionId = 'some-id';
        const params: CaseExecutorParams = {
          subAction: 'update',
          subActionParams: {
            id: 'case-id',
            version: '123',
            title: 'Update title',
            description: null,
            tags: null,
            status: null,
          },
        };

        const executorOptions: CaseActionTypeExecutorOptions = {
          actionId,
          config: {},
          params,
          secrets: {},
          services,
        };

        const result = await caseActionType.executor(executorOptions);

        expect(result).toEqual({ actionId, status: 'ok', data: updateReturn });
        expect(mockCaseClient.update).toHaveBeenCalledWith({
          // Null values have been striped out.
          cases: {
            cases: [
              {
                id: 'case-id',
                version: '123',
                title: 'Update title',
              },
            ],
          },
        });
      });
    });

    describe('addComment', () => {
      it('executes correctly', async () => {
        const commentReturn = {
          id: 'mock-it',
          totalComment: 0,
          closed_at: null,
          closed_by: null,
          connector: { id: 'none', name: 'none', type: ConnectorTypes.none, fields: null },
          created_at: '2019-11-25T21:54:48.952Z',
          created_by: { full_name: 'Awesome D00d', email: 'd00d@awesome.com', username: 'awesome' },
          description: 'This is a brand new case of a bad meanie defacing data',
          external_service: null,
          title: 'Super Bad Security Issue',
          status: 'open' as const,
          tags: ['defacement'],
          updated_at: null,
          updated_by: null,
          version: 'WzksMV0=',
          comments: [
            {
              comment: 'a comment',
              type: 'user' as const,
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
            },
          ],
        };

        mockCaseClient.addComment.mockReturnValue(Promise.resolve(commentReturn));

        const actionId = 'some-id';
        const params: CaseExecutorParams = {
          subAction: 'addComment',
          subActionParams: {
            caseId: 'case-id',
            comment: { comment: 'a comment', type: 'user' },
          },
        };

        const executorOptions: CaseActionTypeExecutorOptions = {
          actionId,
          config: {},
          params,
          secrets: {},
          services,
        };

        const result = await caseActionType.executor(executorOptions);

        expect(result).toEqual({ actionId, status: 'ok', data: commentReturn });
        expect(mockCaseClient.addComment).toHaveBeenCalledWith({
          caseId: 'case-id',
          comment: { comment: 'a comment', type: 'user' },
        });
      });
    });
  });
});
