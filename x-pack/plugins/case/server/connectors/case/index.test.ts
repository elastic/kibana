/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger } from '../../../../../../src/core/server';
import { loggingSystemMock } from '../../../../../../src/core/server/mocks';
import { actionsMock } from '../../../../actions/server/mocks';
import { validateParams } from '../../../../actions/server/lib';
import { ConnectorTypes, CommentType } from '../../../common/api';
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
            connector: {
              id: 'jira',
              name: 'Jira',
              type: '.jira',
              fields: {
                issueType: '10006',
                priority: 'High',
                parent: null,
              },
            },
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

      describe('connector', () => {
        const connectorTests = [
          {
            test: 'jira',
            params: {
              subAction: 'create',
              subActionParams: {
                title: 'Case from case connector!!',
                tags: ['case', 'connector'],
                description: 'Yo fields!!',
                connector: {
                  id: 'jira',
                  name: 'Jira',
                  type: '.jira',
                  fields: {
                    issueType: '10006',
                    priority: 'High',
                    parent: null,
                  },
                },
              },
            },
          },
          {
            test: 'resilient',
            params: {
              subAction: 'create',
              subActionParams: {
                title: 'Case from case connector!!',
                tags: ['case', 'connector'],
                description: 'Yo fields!!',
                connector: {
                  id: 'resilient',
                  name: 'Resilient',
                  type: '.resilient',
                  fields: {
                    incidentTypes: ['13'],
                    severityCode: '3',
                  },
                },
              },
            },
          },
          {
            test: 'servicenow',
            params: {
              subAction: 'create',
              subActionParams: {
                title: 'Case from case connector!!',
                tags: ['case', 'connector'],
                description: 'Yo fields!!',
                connector: {
                  id: 'servicenow',
                  name: 'Servicenow',
                  type: '.servicenow',
                  fields: {
                    impact: 'Medium',
                    severity: 'Medium',
                    urgency: 'Medium',
                  },
                },
              },
            },
          },
          {
            test: 'none',
            params: {
              subAction: 'create',
              subActionParams: {
                title: 'Case from case connector!!',
                tags: ['case', 'connector'],
                description: 'Yo fields!!',
                connector: {
                  id: 'none',
                  name: 'None',
                  type: '.none',
                  fields: null,
                },
              },
            },
          },
        ];

        connectorTests.forEach(({ params, test }) => {
          it(`succeeds when ${test} fields are valid`, () => {
            expect(validateParams(caseActionType, params)).toEqual(params);
          });
        });

        it('set fields to null if they are missing', () => {
          const params: Record<string, unknown> = {
            subAction: 'create',
            subActionParams: {
              title: 'Case from case connector!!',
              tags: ['case', 'connector'],
              description: 'Yo fields!!',
              connector: {
                id: 'servicenow',
                name: 'Servicenow',
                type: '.servicenow',
                fields: {},
              },
            },
          };

          expect(validateParams(caseActionType, params)).toEqual({
            ...params,
            subActionParams: {
              title: 'Case from case connector!!',
              tags: ['case', 'connector'],
              description: 'Yo fields!!',
              connector: {
                id: 'servicenow',
                name: 'Servicenow',
                type: '.servicenow',
                fields: { impact: null, severity: null, urgency: null },
              },
            },
          });
        });

        it('succeeds when none fields are valid', () => {
          const params: Record<string, unknown> = {
            subAction: 'create',
            subActionParams: {
              title: 'Case from case connector!!',
              tags: ['case', 'connector'],
              description: 'Yo fields!!',
              connector: {
                id: 'none',
                name: 'None',
                type: '.none',
                fields: null,
              },
            },
          };

          expect(validateParams(caseActionType, params)).toEqual(params);
        });

        it('fails when issueType is not provided', () => {
          const params: Record<string, unknown> = {
            subAction: 'create',
            subActionParams: {
              title: 'Case from case connector!!',
              tags: ['case', 'connector'],
              description: 'Yo fields!!',
              connector: {
                id: 'jira',
                name: 'Jira',
                type: '.jira',
                fields: {
                  priority: 'High',
                  parent: null,
                },
              },
            },
          };

          expect(() => {
            validateParams(caseActionType, params);
          }).toThrow(
            '[0.subActionParams.connector.fields.issueType]: expected value of type [string] but got [undefined]'
          );
        });

        it('fails with excess fields', () => {
          const params: Record<string, unknown> = {
            subAction: 'create',
            subActionParams: {
              title: 'Case from case connector!!',
              tags: ['case', 'connector'],
              description: 'Yo fields!!',
              connector: {
                id: 'servicenow',
                name: 'Servicenow',
                type: '.servicenow',
                fields: {
                  impact: 'Medium',
                  severity: 'Medium',
                  urgency: 'Medium',
                  excess: null,
                },
              },
            },
          };

          expect(() => {
            validateParams(caseActionType, params);
          }).toThrow(
            '[0.subActionParams.connector.fields.excess]: definition for this key is missing'
          );
        });

        it('fails with valid fields but wrong type', () => {
          const params: Record<string, unknown> = {
            subAction: 'create',
            subActionParams: {
              title: 'Case from case connector!!',
              tags: ['case', 'connector'],
              description: 'Yo fields!!',
              connector: {
                id: 'resilient',
                name: 'Resilient',
                type: '.resilient',
                fields: {
                  issueType: '10006',
                  priority: 'High',
                  parent: null,
                },
              },
            },
          };

          expect(() => {
            validateParams(caseActionType, params);
          }).toThrow(
            '[0.subActionParams.connector.fields.issueType]: definition for this key is missing'
          );
        });

        it('fails when fields are not null and the type is none', () => {
          const params: Record<string, unknown> = {
            subAction: 'create',
            subActionParams: {
              title: 'Case from case connector!!',
              tags: ['case', 'connector'],
              description: 'Yo fields!!',
              connector: {
                id: 'none',
                name: 'None',
                type: '.none',
                fields: {},
              },
            },
          };

          expect(() => {
            validateParams(caseActionType, params);
          }).toThrow(
            '[0.subActionParams.connector]: Fields must be set to null for connectors of type .none'
          );
        });
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
            connector: null,
            ...(params.subActionParams as Record<string, unknown>),
          },
        });
      });

      describe('connector', () => {
        it('succeeds when jira fields are valid', () => {
          const params: Record<string, unknown> = {
            subAction: 'update',
            subActionParams: {
              id: 'case-id',
              version: '123',
              connector: {
                id: 'jira',
                name: 'Jira',
                type: '.jira',
                fields: {
                  issueType: '10006',
                  priority: 'High',
                  parent: null,
                },
              },
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

        it('succeeds when resilient fields are valid', () => {
          const params: Record<string, unknown> = {
            subAction: 'update',
            subActionParams: {
              id: 'case-id',
              version: '123',
              connector: {
                id: 'resilient',
                name: 'Resilient',
                type: '.resilient',
                fields: {
                  incidentTypes: ['13'],
                  severityCode: '3',
                },
              },
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

        it('succeeds when servicenow fields are valid', () => {
          const params: Record<string, unknown> = {
            subAction: 'update',
            subActionParams: {
              id: 'case-id',
              version: '123',
              connector: {
                id: 'servicenow',
                name: 'Servicenow',
                type: '.servicenow',
                fields: {
                  impact: 'Medium',
                  severity: 'Medium',
                  urgency: 'Medium',
                },
              },
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

        it('set fields to null if they are missing', () => {
          const params: Record<string, unknown> = {
            subAction: 'update',
            subActionParams: {
              id: 'case-id',
              version: '123',
              connector: {
                id: 'servicenow',
                name: 'Servicenow',
                type: '.servicenow',
                fields: {},
              },
            },
          };

          expect(validateParams(caseActionType, params)).toEqual({
            ...params,
            subActionParams: {
              id: 'case-id',
              version: '123',
              description: null,
              tags: null,
              title: null,
              status: null,
              connector: {
                id: 'servicenow',
                name: 'Servicenow',
                type: '.servicenow',
                fields: { impact: null, severity: null, urgency: null },
              },
            },
          });
        });

        it('succeeds when none fields are valid', () => {
          const params: Record<string, unknown> = {
            subAction: 'update',
            subActionParams: {
              id: 'case-id',
              version: '123',
              connector: {
                id: 'none',
                name: 'None',
                type: '.none',
                fields: null,
              },
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

        it('fails when issueType is not provided', () => {
          const params: Record<string, unknown> = {
            subAction: 'update',
            subActionParams: {
              id: 'case-id',
              version: '123',
              connector: {
                id: 'jira',
                name: 'Jira',
                type: '.jira',
                fields: {
                  priority: 'High',
                  parent: null,
                },
              },
            },
          };

          expect(() => {
            validateParams(caseActionType, params);
          }).toThrow(
            '[subActionParams.connector.0.fields.issueType]: expected value of type [string] but got [undefined]'
          );
        });

        it('fails with excess fields', () => {
          const params: Record<string, unknown> = {
            subAction: 'update',
            subActionParams: {
              id: 'case-id',
              version: '123',
              connector: {
                id: 'servicenow',
                name: 'Servicenow',
                type: '.servicenow',
                fields: {
                  impact: 'Medium',
                  severity: 'Medium',
                  urgency: 'Medium',
                  excess: null,
                },
              },
            },
          };

          expect(() => {
            validateParams(caseActionType, params);
          }).toThrow(
            '[subActionParams.connector.0.fields.excess]: definition for this key is missing'
          );
        });

        it('fails with valid fields but wrong type', () => {
          const params: Record<string, unknown> = {
            subAction: 'update',
            subActionParams: {
              id: 'case-id',
              version: '123',
              connector: {
                id: 'resilient',
                name: 'Resilient',
                type: '.resilient',
                fields: {
                  issueType: '10006',
                  priority: 'High',
                  parent: null,
                },
              },
            },
          };

          expect(() => {
            validateParams(caseActionType, params);
          }).toThrow(
            '[subActionParams.connector.0.fields.issueType]: definition for this key is missing'
          );
        });

        it('fails when fields are not null and the type is none', () => {
          const params: Record<string, unknown> = {
            subAction: 'update',
            subActionParams: {
              id: 'case-id',
              version: '123',
              connector: {
                id: 'none',
                name: 'None',
                type: '.none',
                fields: {},
              },
            },
          };

          expect(() => {
            validateParams(caseActionType, params);
          }).toThrow(
            '[subActionParams.connector.0]: Fields must be set to null for connectors of type .none'
          );
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
            comment: { comment: 'a comment', type: CommentType.user },
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
            connector: {
              id: 'jira',
              name: 'Jira',
              type: '.jira',
              fields: {
                issueType: '10006',
                priority: 'High',
                parent: null,
              },
            },
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
              id: 'jira',
              name: 'Jira',
              type: '.jira',
              fields: {
                issueType: '10006',
                priority: 'High',
                parent: null,
              },
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
            connector: null,
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
              type: CommentType.user as const,
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
            comment: { comment: 'a comment', type: CommentType.user },
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
          comment: { comment: 'a comment', type: CommentType.user },
        });
      });
    });
  });
});
