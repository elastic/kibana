/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import type {
  SavedObject,
  SavedObjectsBulkCreateObject,
  SavedObjectsFindResponse,
  SavedObjectsUpdateResponse,
} from '@kbn/core/server';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import type { CaseAttributes } from '../../../common/api';
import { Actions, ActionTypes, CaseSeverity, CaseStatuses } from '../../../common/api';
import { SECURITY_SOLUTION_OWNER } from '../../../common/constants';

import { createCaseSavedObjectResponse } from '../test_utils';
import {
  casePayload,
  externalService,
  originalCases,
  updatedCases,
  comment,
  attachments,
  updatedAssigneesCases,
  originalCasesWithAssignee,
  updatedTagsCases,
} from './mocks';
import { CaseUserActionService } from '.';
import { createPersistableStateAttachmentTypeRegistryMock } from '../../attachment_framework/mocks';
import { serializerMock } from '@kbn/core-saved-objects-base-server-mocks';
import { createUserActionFindSO, createConnectorUserAction } from './test_utils';

describe('CaseUserActionService', () => {
  const persistableStateAttachmentTypeRegistry = createPersistableStateAttachmentTypeRegistryMock();

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2022-01-09T22:00:00.000Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('methods', () => {
    let service: CaseUserActionService;
    const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
    unsecuredSavedObjectsClient.create.mockResolvedValue({
      id: 'created_user_action_id',
    } as SavedObject);

    unsecuredSavedObjectsClient.bulkCreate.mockImplementation(
      async (objects: SavedObjectsBulkCreateObject[]) => {
        const savedObjects: SavedObject[] = [];
        for (let i = 0; i < objects.length; i++) {
          savedObjects.push({ id: i } as unknown as SavedObject);
        }

        return {
          saved_objects: savedObjects,
        };
      }
    );
    const mockLogger = loggerMock.create();
    const commonArgs = {
      caseId: '123',
      user: { full_name: 'Elastic User', username: 'elastic', email: 'elastic@elastic.co' },
      owner: SECURITY_SOLUTION_OWNER,
    };
    const mockAuditLogger = auditLoggerMock.create();

    const soSerializerMock = serializerMock.create();

    beforeEach(() => {
      jest.clearAllMocks();
      service = new CaseUserActionService({
        unsecuredSavedObjectsClient,
        log: mockLogger,
        persistableStateAttachmentTypeRegistry,
        auditLogger: mockAuditLogger,
        savedObjectsSerializer: soSerializerMock,
      });
    });

    describe('createUserAction', () => {
      describe('create case', () => {
        it('creates a create case user action', async () => {
          await service.creator.createUserAction({
            ...commonArgs,
            payload: casePayload,
            type: ActionTypes.create_case,
          });

          expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledWith(
            'cases-user-actions',
            {
              action: Actions.create,
              created_at: '2022-01-09T22:00:00.000Z',
              created_by: {
                email: 'elastic@elastic.co',
                full_name: 'Elastic User',
                username: 'elastic',
              },
              type: 'create_case',
              owner: 'securitySolution',
              payload: {
                assignees: [{ uid: '1' }],
                connector: {
                  fields: {
                    category: 'Denial of Service',
                    destIp: true,
                    malwareHash: true,
                    malwareUrl: true,
                    priority: '2',
                    sourceIp: true,
                    subcategory: '45',
                  },
                  name: 'ServiceNow SN',
                  type: '.servicenow-sir',
                },
                description: 'testing sir',
                owner: 'securitySolution',
                settings: { syncAlerts: true },
                status: 'open',
                severity: 'low',
                tags: ['sir'],
                title: 'Case SIR',
              },
            },
            {
              references: [
                { id: '123', name: 'associated-cases', type: 'cases' },
                { id: '456', name: 'connectorId', type: 'action' },
              ],
            }
          );
        });

        it('logs a create case user action', async () => {
          await service.creator.createUserAction({
            ...commonArgs,
            payload: casePayload,
            type: ActionTypes.create_case,
          });

          expect(mockAuditLogger.log).toBeCalledTimes(1);
          expect(mockAuditLogger.log.mock.calls[0]).toMatchInlineSnapshot(`
            Array [
              Object {
                "event": Object {
                  "action": "case_user_action_create_case",
                  "category": Array [
                    "database",
                  ],
                  "outcome": "success",
                  "type": Array [
                    "creation",
                  ],
                },
                "kibana": Object {
                  "saved_object": Object {
                    "id": "123",
                    "type": "cases",
                  },
                },
                "message": "User created case id: 123 - user action id: created_user_action_id",
              },
            ]
          `);
        });

        describe('status', () => {
          it('creates an update status user action', async () => {
            await service.creator.createUserAction({
              ...commonArgs,
              payload: { status: CaseStatuses.closed },
              type: ActionTypes.status,
            });

            expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledWith(
              'cases-user-actions',
              {
                action: Actions.update,
                created_at: '2022-01-09T22:00:00.000Z',
                created_by: {
                  email: 'elastic@elastic.co',
                  full_name: 'Elastic User',
                  username: 'elastic',
                },
                type: 'status',
                owner: 'securitySolution',
                payload: { status: 'closed' },
              },
              { references: [{ id: '123', name: 'associated-cases', type: 'cases' }] }
            );
          });

          it('logs an update status user action', async () => {
            await service.creator.createUserAction({
              ...commonArgs,
              payload: { status: CaseStatuses.closed },
              type: ActionTypes.status,
            });

            expect(mockAuditLogger.log).toBeCalledTimes(1);
            expect(mockAuditLogger.log.mock.calls[0]).toMatchInlineSnapshot(`
              Array [
                Object {
                  "event": Object {
                    "action": "case_user_action_update_case_status",
                    "category": Array [
                      "database",
                    ],
                    "outcome": "success",
                    "type": Array [
                      "change",
                    ],
                  },
                  "kibana": Object {
                    "saved_object": Object {
                      "id": "123",
                      "type": "cases",
                    },
                  },
                  "message": "User updated the status for case id: 123 - user action id: created_user_action_id",
                },
              ]
            `);
          });
        });

        describe('severity', () => {
          it('creates an update severity user action', async () => {
            await service.creator.createUserAction({
              ...commonArgs,
              payload: { severity: CaseSeverity.MEDIUM },
              type: ActionTypes.severity,
            });

            expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledWith(
              'cases-user-actions',
              {
                action: Actions.update,
                created_at: '2022-01-09T22:00:00.000Z',
                created_by: {
                  email: 'elastic@elastic.co',
                  full_name: 'Elastic User',
                  username: 'elastic',
                },
                type: 'severity',
                owner: 'securitySolution',
                payload: { severity: 'medium' },
              },
              { references: [{ id: '123', name: 'associated-cases', type: 'cases' }] }
            );
          });

          it('logs an update severity user action', async () => {
            await service.creator.createUserAction({
              ...commonArgs,
              payload: { severity: CaseSeverity.MEDIUM },
              type: ActionTypes.severity,
            });

            expect(mockAuditLogger.log).toBeCalledTimes(1);
            expect(mockAuditLogger.log.mock.calls[0]).toMatchInlineSnapshot(`
              Array [
                Object {
                  "event": Object {
                    "action": "case_user_action_update_case_severity",
                    "category": Array [
                      "database",
                    ],
                    "outcome": "success",
                    "type": Array [
                      "change",
                    ],
                  },
                  "kibana": Object {
                    "saved_object": Object {
                      "id": "123",
                      "type": "cases",
                    },
                  },
                  "message": "User updated the severity for case id: 123 - user action id: created_user_action_id",
                },
              ]
            `);
          });
        });

        describe('push', () => {
          it('creates a push user action', async () => {
            await service.creator.createUserAction({
              ...commonArgs,
              payload: { externalService },
              type: ActionTypes.pushed,
            });

            expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledWith(
              'cases-user-actions',
              {
                action: Actions.push_to_service,
                created_at: '2022-01-09T22:00:00.000Z',
                created_by: {
                  email: 'elastic@elastic.co',
                  full_name: 'Elastic User',
                  username: 'elastic',
                },
                type: 'pushed',
                owner: 'securitySolution',
                payload: {
                  externalService: {
                    connector_name: 'ServiceNow SN',
                    external_id: 'external-id',
                    external_title: 'SIR0010037',
                    external_url:
                      'https://dev92273.service-now.com/nav_to.do?uri=sn_si_incident.do?sys_id=external-id',
                    pushed_at: '2021-02-03T17:41:26.108Z',
                    pushed_by: {
                      email: 'elastic@elastic.co',
                      full_name: 'Elastic',
                      username: 'elastic',
                    },
                  },
                },
              },
              {
                references: [
                  { id: '123', name: 'associated-cases', type: 'cases' },
                  { id: '456', name: 'pushConnectorId', type: 'action' },
                ],
              }
            );
          });

          it('logs a push user action', async () => {
            await service.creator.createUserAction({
              ...commonArgs,
              payload: { externalService },
              type: ActionTypes.pushed,
            });

            expect(mockAuditLogger.log).toBeCalledTimes(1);
            expect(mockAuditLogger.log.mock.calls[0]).toMatchInlineSnapshot(`
              Array [
                Object {
                  "event": Object {
                    "action": "case_user_action_pushed_case",
                    "category": Array [
                      "database",
                    ],
                    "outcome": "success",
                    "type": Array [
                      "change",
                    ],
                  },
                  "kibana": Object {
                    "saved_object": Object {
                      "id": "123",
                      "type": "cases",
                    },
                  },
                  "message": "User pushed case id: 123 to an external service with connector id: 456 - user action id: created_user_action_id",
                },
              ]
            `);
          });
        });

        describe('comment', () => {
          it.each([[Actions.create], [Actions.delete], [Actions.update]])(
            'creates a comment user action of action: %s',
            async (action) => {
              await service.creator.createUserAction({
                ...commonArgs,
                type: ActionTypes.comment,
                action,
                attachmentId: 'test-id',
                payload: { attachment: comment },
              });

              expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledWith(
                'cases-user-actions',
                {
                  action,
                  created_at: '2022-01-09T22:00:00.000Z',
                  created_by: {
                    email: 'elastic@elastic.co',
                    full_name: 'Elastic User',
                    username: 'elastic',
                  },
                  type: 'comment',
                  owner: 'securitySolution',
                  payload: {
                    comment: {
                      comment: 'a comment',
                      type: 'user',
                      owner: 'securitySolution',
                    },
                  },
                },
                {
                  references: [
                    { id: '123', name: 'associated-cases', type: 'cases' },
                    { id: 'test-id', name: 'associated-cases-comments', type: 'cases-comments' },
                  ],
                }
              );
            }
          );

          it.each([[Actions.create], [Actions.delete], [Actions.update]])(
            'logs a comment user action of action: %s',
            async (action) => {
              await service.creator.createUserAction({
                ...commonArgs,
                type: ActionTypes.comment,
                action,
                attachmentId: 'test-id',
                payload: { attachment: comment },
              });

              expect(mockAuditLogger.log).toBeCalledTimes(1);
              expect(mockAuditLogger.log.mock.calls[0]).toMatchSnapshot();
            }
          );
        });
      });
    });

    describe('bulkAuditLogCaseDeletion', () => {
      it('logs a delete case audit log message', async () => {
        await service.creator.bulkAuditLogCaseDeletion(['1', '2']);

        expect(unsecuredSavedObjectsClient.bulkCreate).not.toHaveBeenCalled();

        expect(mockAuditLogger.log).toHaveBeenCalledTimes(2);
        expect(mockAuditLogger.log.mock.calls).toMatchInlineSnapshot(`
          Array [
            Array [
              Object {
                "event": Object {
                  "action": "case_user_action_delete_case",
                  "category": Array [
                    "database",
                  ],
                  "outcome": "success",
                  "type": Array [
                    "deletion",
                  ],
                },
                "kibana": Object {
                  "saved_object": Object {
                    "id": "1",
                    "type": "cases",
                  },
                },
                "message": "User deleted case id: 1",
              },
            ],
            Array [
              Object {
                "event": Object {
                  "action": "case_user_action_delete_case",
                  "category": Array [
                    "database",
                  ],
                  "outcome": "success",
                  "type": Array [
                    "deletion",
                  ],
                },
                "kibana": Object {
                  "saved_object": Object {
                    "id": "2",
                    "type": "cases",
                  },
                },
                "message": "User deleted case id: 2",
              },
            ],
          ]
        `);
      });
    });

    describe('bulkCreateUpdateCase', () => {
      it('creates the correct user actions when bulk updating cases', async () => {
        await service.creator.bulkCreateUpdateCase({
          ...commonArgs,
          originalCases,
          updatedCases,
          user: commonArgs.user,
        });

        expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledWith(
          [
            {
              attributes: {
                action: Actions.update,
                created_at: '2022-01-09T22:00:00.000Z',
                created_by: {
                  email: 'elastic@elastic.co',
                  full_name: 'Elastic User',
                  username: 'elastic',
                },
                type: 'title',
                owner: 'securitySolution',
                payload: { title: 'updated title' },
              },
              references: [{ id: '1', name: 'associated-cases', type: 'cases' }],
              type: 'cases-user-actions',
            },
            {
              attributes: {
                action: Actions.update,
                created_at: '2022-01-09T22:00:00.000Z',
                created_by: {
                  email: 'elastic@elastic.co',
                  full_name: 'Elastic User',
                  username: 'elastic',
                },
                type: 'status',
                owner: 'securitySolution',
                payload: { status: 'closed' },
              },
              references: [{ id: '1', name: 'associated-cases', type: 'cases' }],
              type: 'cases-user-actions',
            },
            {
              attributes: {
                action: Actions.update,
                created_at: '2022-01-09T22:00:00.000Z',
                created_by: {
                  email: 'elastic@elastic.co',
                  full_name: 'Elastic User',
                  username: 'elastic',
                },
                type: 'connector',
                owner: 'securitySolution',
                payload: {
                  connector: {
                    fields: {
                      category: 'Denial of Service',
                      destIp: true,
                      malwareHash: true,
                      malwareUrl: true,
                      priority: '2',
                      sourceIp: true,
                      subcategory: '45',
                    },
                    name: 'ServiceNow SN',
                    type: '.servicenow-sir',
                  },
                },
              },
              references: [
                { id: '1', name: 'associated-cases', type: 'cases' },
                { id: '456', name: 'connectorId', type: 'action' },
              ],
              type: 'cases-user-actions',
            },
            {
              attributes: {
                action: Actions.update,
                created_at: '2022-01-09T22:00:00.000Z',
                created_by: {
                  email: 'elastic@elastic.co',
                  full_name: 'Elastic User',
                  username: 'elastic',
                },
                type: 'description',
                owner: 'securitySolution',
                payload: { description: 'updated desc' },
              },
              references: [{ id: '2', name: 'associated-cases', type: 'cases' }],
              type: 'cases-user-actions',
            },
            {
              attributes: {
                action: 'add',
                created_at: '2022-01-09T22:00:00.000Z',
                created_by: {
                  email: 'elastic@elastic.co',
                  full_name: 'Elastic User',
                  username: 'elastic',
                },
                type: 'tags',
                owner: 'securitySolution',
                payload: { tags: ['one', 'two'] },
              },
              references: [{ id: '2', name: 'associated-cases', type: 'cases' }],
              type: 'cases-user-actions',
            },
            {
              attributes: {
                action: 'delete',
                created_at: '2022-01-09T22:00:00.000Z',
                created_by: {
                  email: 'elastic@elastic.co',
                  full_name: 'Elastic User',
                  username: 'elastic',
                },
                type: 'tags',
                owner: 'securitySolution',
                payload: { tags: ['defacement'] },
              },
              references: [{ id: '2', name: 'associated-cases', type: 'cases' }],
              type: 'cases-user-actions',
            },
            {
              attributes: {
                action: Actions.update,
                created_at: '2022-01-09T22:00:00.000Z',
                created_by: {
                  email: 'elastic@elastic.co',
                  full_name: 'Elastic User',
                  username: 'elastic',
                },
                type: 'settings',
                owner: 'securitySolution',
                payload: { settings: { syncAlerts: false } },
              },
              references: [{ id: '2', name: 'associated-cases', type: 'cases' }],
              type: 'cases-user-actions',
            },
            {
              attributes: {
                action: 'update',
                created_at: '2022-01-09T22:00:00.000Z',
                created_by: {
                  email: 'elastic@elastic.co',
                  full_name: 'Elastic User',
                  username: 'elastic',
                },
                owner: 'securitySolution',
                payload: {
                  severity: 'critical',
                },
                type: 'severity',
              },
              references: [
                {
                  id: '2',
                  name: 'associated-cases',
                  type: 'cases',
                },
              ],
              type: 'cases-user-actions',
            },
          ],
          { refresh: undefined }
        );
      });

      it('logs the correct user actions when bulk updating cases', async () => {
        await service.creator.bulkCreateUpdateCase({
          ...commonArgs,
          originalCases,
          updatedCases,
          user: commonArgs.user,
        });

        expect(mockAuditLogger.log).toBeCalledTimes(8);
        expect(mockAuditLogger.log.mock.calls).toMatchInlineSnapshot(`
          Array [
            Array [
              Object {
                "event": Object {
                  "action": "case_user_action_update_case_title",
                  "category": Array [
                    "database",
                  ],
                  "outcome": "success",
                  "type": Array [
                    "change",
                  ],
                },
                "kibana": Object {
                  "saved_object": Object {
                    "id": "1",
                    "type": "cases",
                  },
                },
                "message": "User updated the title for case id: 1 - user action id: 0",
              },
            ],
            Array [
              Object {
                "event": Object {
                  "action": "case_user_action_update_case_status",
                  "category": Array [
                    "database",
                  ],
                  "outcome": "success",
                  "type": Array [
                    "change",
                  ],
                },
                "kibana": Object {
                  "saved_object": Object {
                    "id": "1",
                    "type": "cases",
                  },
                },
                "message": "User updated the status for case id: 1 - user action id: 1",
              },
            ],
            Array [
              Object {
                "event": Object {
                  "action": "case_user_action_update_case_connector",
                  "category": Array [
                    "database",
                  ],
                  "outcome": "success",
                  "type": Array [
                    "change",
                  ],
                },
                "kibana": Object {
                  "saved_object": Object {
                    "id": "1",
                    "type": "cases",
                  },
                },
                "message": "User changed the case connector to id: 456 for case id: 1 - user action id: 2",
              },
            ],
            Array [
              Object {
                "event": Object {
                  "action": "case_user_action_update_case_description",
                  "category": Array [
                    "database",
                  ],
                  "outcome": "success",
                  "type": Array [
                    "change",
                  ],
                },
                "kibana": Object {
                  "saved_object": Object {
                    "id": "2",
                    "type": "cases",
                  },
                },
                "message": "User updated the description for case id: 2 - user action id: 3",
              },
            ],
            Array [
              Object {
                "event": Object {
                  "action": "case_user_action_add_case_tags",
                  "category": Array [
                    "database",
                  ],
                  "outcome": "success",
                  "type": Array [
                    "change",
                  ],
                },
                "kibana": Object {
                  "saved_object": Object {
                    "id": "2",
                    "type": "cases",
                  },
                },
                "message": "User added tags to case id: 2 - user action id: 4",
              },
            ],
            Array [
              Object {
                "event": Object {
                  "action": "case_user_action_delete_case_tags",
                  "category": Array [
                    "database",
                  ],
                  "outcome": "success",
                  "type": Array [
                    "deletion",
                  ],
                },
                "kibana": Object {
                  "saved_object": Object {
                    "id": "2",
                    "type": "cases",
                  },
                },
                "message": "User deleted tags in case id: 2 - user action id: 5",
              },
            ],
            Array [
              Object {
                "event": Object {
                  "action": "case_user_action_update_case_settings",
                  "category": Array [
                    "database",
                  ],
                  "outcome": "success",
                  "type": Array [
                    "change",
                  ],
                },
                "kibana": Object {
                  "saved_object": Object {
                    "id": "2",
                    "type": "cases",
                  },
                },
                "message": "User updated the settings for case id: 2 - user action id: 6",
              },
            ],
            Array [
              Object {
                "event": Object {
                  "action": "case_user_action_update_case_severity",
                  "category": Array [
                    "database",
                  ],
                  "outcome": "success",
                  "type": Array [
                    "change",
                  ],
                },
                "kibana": Object {
                  "saved_object": Object {
                    "id": "2",
                    "type": "cases",
                  },
                },
                "message": "User updated the severity for case id: 2 - user action id: 7",
              },
            ],
          ]
        `);
      });

      it('creates the correct user actions when an assignee is added', async () => {
        await service.creator.bulkCreateUpdateCase({
          ...commonArgs,
          originalCases,
          updatedCases: updatedAssigneesCases,
          user: commonArgs.user,
        });

        expect(unsecuredSavedObjectsClient.bulkCreate.mock.calls[0]).toMatchInlineSnapshot(`
          Array [
            Array [
              Object {
                "attributes": Object {
                  "action": "add",
                  "created_at": "2022-01-09T22:00:00.000Z",
                  "created_by": Object {
                    "email": "elastic@elastic.co",
                    "full_name": "Elastic User",
                    "username": "elastic",
                  },
                  "owner": "securitySolution",
                  "payload": Object {
                    "assignees": Array [
                      Object {
                        "uid": "1",
                      },
                    ],
                  },
                  "type": "assignees",
                },
                "references": Array [
                  Object {
                    "id": "1",
                    "name": "associated-cases",
                    "type": "cases",
                  },
                ],
                "type": "cases-user-actions",
              },
            ],
            Object {
              "refresh": undefined,
            },
          ]
        `);
      });

      it('logs the correct user actions when an assignee is added', async () => {
        await service.creator.bulkCreateUpdateCase({
          ...commonArgs,
          originalCases,
          updatedCases: updatedAssigneesCases,
          user: commonArgs.user,
        });

        expect(mockAuditLogger.log).toBeCalledTimes(1);
        expect(mockAuditLogger.log.mock.calls).toMatchInlineSnapshot(`
          Array [
            Array [
              Object {
                "event": Object {
                  "action": "case_user_action_add_case_assignees",
                  "category": Array [
                    "database",
                  ],
                  "outcome": "success",
                  "type": Array [
                    "change",
                  ],
                },
                "kibana": Object {
                  "saved_object": Object {
                    "id": "1",
                    "type": "cases",
                  },
                },
                "message": "User assigned uids: [1] to case id: 1 - user action id: 0",
              },
            ],
          ]
        `);
      });

      it('creates the correct user actions when an assignee is removed', async () => {
        const casesWithAssigneeRemoved: Array<SavedObjectsUpdateResponse<CaseAttributes>> = [
          {
            ...createCaseSavedObjectResponse(),
            id: '1',
            attributes: {
              assignees: [],
            },
          },
        ];

        await service.creator.bulkCreateUpdateCase({
          ...commonArgs,
          originalCases: originalCasesWithAssignee,
          updatedCases: casesWithAssigneeRemoved,
          user: commonArgs.user,
        });

        expect(unsecuredSavedObjectsClient.bulkCreate.mock.calls[0]).toMatchInlineSnapshot(`
          Array [
            Array [
              Object {
                "attributes": Object {
                  "action": "delete",
                  "created_at": "2022-01-09T22:00:00.000Z",
                  "created_by": Object {
                    "email": "elastic@elastic.co",
                    "full_name": "Elastic User",
                    "username": "elastic",
                  },
                  "owner": "securitySolution",
                  "payload": Object {
                    "assignees": Array [
                      Object {
                        "uid": "1",
                      },
                    ],
                  },
                  "type": "assignees",
                },
                "references": Array [
                  Object {
                    "id": "1",
                    "name": "associated-cases",
                    "type": "cases",
                  },
                ],
                "type": "cases-user-actions",
              },
            ],
            Object {
              "refresh": undefined,
            },
          ]
        `);
      });

      it('logs the correct user actions when an assignee is removed', async () => {
        const casesWithAssigneeRemoved: Array<SavedObjectsUpdateResponse<CaseAttributes>> = [
          {
            ...createCaseSavedObjectResponse(),
            id: '1',
            attributes: {
              assignees: [],
            },
          },
        ];

        await service.creator.bulkCreateUpdateCase({
          ...commonArgs,
          originalCases: originalCasesWithAssignee,
          updatedCases: casesWithAssigneeRemoved,
          user: commonArgs.user,
        });

        expect(mockAuditLogger.log).toBeCalledTimes(1);
        expect(mockAuditLogger.log.mock.calls).toMatchInlineSnapshot(`
          Array [
            Array [
              Object {
                "event": Object {
                  "action": "case_user_action_delete_case_assignees",
                  "category": Array [
                    "database",
                  ],
                  "outcome": "success",
                  "type": Array [
                    "deletion",
                  ],
                },
                "kibana": Object {
                  "saved_object": Object {
                    "id": "1",
                    "type": "cases",
                  },
                },
                "message": "User unassigned uids: [1] from case id: 1 - user action id: 0",
              },
            ],
          ]
        `);
      });

      it('creates the correct user actions when assignees are added and removed', async () => {
        const caseAssignees: Array<SavedObjectsUpdateResponse<CaseAttributes>> = [
          {
            ...createCaseSavedObjectResponse(),
            id: '1',
            attributes: {
              assignees: [{ uid: '2' }],
            },
          },
        ];

        await service.creator.bulkCreateUpdateCase({
          ...commonArgs,
          originalCases: originalCasesWithAssignee,
          updatedCases: caseAssignees,
          user: commonArgs.user,
        });

        expect(unsecuredSavedObjectsClient.bulkCreate.mock.calls[0]).toMatchInlineSnapshot(`
          Array [
            Array [
              Object {
                "attributes": Object {
                  "action": "add",
                  "created_at": "2022-01-09T22:00:00.000Z",
                  "created_by": Object {
                    "email": "elastic@elastic.co",
                    "full_name": "Elastic User",
                    "username": "elastic",
                  },
                  "owner": "securitySolution",
                  "payload": Object {
                    "assignees": Array [
                      Object {
                        "uid": "2",
                      },
                    ],
                  },
                  "type": "assignees",
                },
                "references": Array [
                  Object {
                    "id": "1",
                    "name": "associated-cases",
                    "type": "cases",
                  },
                ],
                "type": "cases-user-actions",
              },
              Object {
                "attributes": Object {
                  "action": "delete",
                  "created_at": "2022-01-09T22:00:00.000Z",
                  "created_by": Object {
                    "email": "elastic@elastic.co",
                    "full_name": "Elastic User",
                    "username": "elastic",
                  },
                  "owner": "securitySolution",
                  "payload": Object {
                    "assignees": Array [
                      Object {
                        "uid": "1",
                      },
                    ],
                  },
                  "type": "assignees",
                },
                "references": Array [
                  Object {
                    "id": "1",
                    "name": "associated-cases",
                    "type": "cases",
                  },
                ],
                "type": "cases-user-actions",
              },
            ],
            Object {
              "refresh": undefined,
            },
          ]
        `);
      });

      it('logs the correct user actions when assignees are added and removed', async () => {
        const caseAssignees: Array<SavedObjectsUpdateResponse<CaseAttributes>> = [
          {
            ...createCaseSavedObjectResponse(),
            id: '1',
            attributes: {
              assignees: [{ uid: '2' }],
            },
          },
        ];

        await service.creator.bulkCreateUpdateCase({
          ...commonArgs,
          originalCases: originalCasesWithAssignee,
          updatedCases: caseAssignees,
          user: commonArgs.user,
        });

        expect(mockAuditLogger.log).toBeCalledTimes(2);
        expect(mockAuditLogger.log.mock.calls).toMatchInlineSnapshot(`
          Array [
            Array [
              Object {
                "event": Object {
                  "action": "case_user_action_add_case_assignees",
                  "category": Array [
                    "database",
                  ],
                  "outcome": "success",
                  "type": Array [
                    "change",
                  ],
                },
                "kibana": Object {
                  "saved_object": Object {
                    "id": "1",
                    "type": "cases",
                  },
                },
                "message": "User assigned uids: [2] to case id: 1 - user action id: 0",
              },
            ],
            Array [
              Object {
                "event": Object {
                  "action": "case_user_action_delete_case_assignees",
                  "category": Array [
                    "database",
                  ],
                  "outcome": "success",
                  "type": Array [
                    "deletion",
                  ],
                },
                "kibana": Object {
                  "saved_object": Object {
                    "id": "1",
                    "type": "cases",
                  },
                },
                "message": "User unassigned uids: [1] from case id: 1 - user action id: 1",
              },
            ],
          ]
        `);
      });

      it('creates the correct user actions when tags are added and removed', async () => {
        await service.creator.bulkCreateUpdateCase({
          ...commonArgs,
          originalCases,
          updatedCases: updatedTagsCases,
          user: commonArgs.user,
        });

        expect(unsecuredSavedObjectsClient.bulkCreate.mock.calls[0]).toMatchInlineSnapshot(`
          Array [
            Array [
              Object {
                "attributes": Object {
                  "action": "add",
                  "created_at": "2022-01-09T22:00:00.000Z",
                  "created_by": Object {
                    "email": "elastic@elastic.co",
                    "full_name": "Elastic User",
                    "username": "elastic",
                  },
                  "owner": "securitySolution",
                  "payload": Object {
                    "tags": Array [
                      "a",
                      "b",
                    ],
                  },
                  "type": "tags",
                },
                "references": Array [
                  Object {
                    "id": "1",
                    "name": "associated-cases",
                    "type": "cases",
                  },
                ],
                "type": "cases-user-actions",
              },
              Object {
                "attributes": Object {
                  "action": "delete",
                  "created_at": "2022-01-09T22:00:00.000Z",
                  "created_by": Object {
                    "email": "elastic@elastic.co",
                    "full_name": "Elastic User",
                    "username": "elastic",
                  },
                  "owner": "securitySolution",
                  "payload": Object {
                    "tags": Array [
                      "defacement",
                    ],
                  },
                  "type": "tags",
                },
                "references": Array [
                  Object {
                    "id": "1",
                    "name": "associated-cases",
                    "type": "cases",
                  },
                ],
                "type": "cases-user-actions",
              },
            ],
            Object {
              "refresh": undefined,
            },
          ]
        `);
      });

      it('logs the correct user actions when tags are added and removed', async () => {
        await service.creator.bulkCreateUpdateCase({
          ...commonArgs,
          originalCases,
          updatedCases: updatedTagsCases,
          user: commonArgs.user,
        });

        expect(mockAuditLogger.log).toBeCalledTimes(2);
        expect(mockAuditLogger.log.mock.calls).toMatchInlineSnapshot(`
          Array [
            Array [
              Object {
                "event": Object {
                  "action": "case_user_action_add_case_tags",
                  "category": Array [
                    "database",
                  ],
                  "outcome": "success",
                  "type": Array [
                    "change",
                  ],
                },
                "kibana": Object {
                  "saved_object": Object {
                    "id": "1",
                    "type": "cases",
                  },
                },
                "message": "User added tags to case id: 1 - user action id: 0",
              },
            ],
            Array [
              Object {
                "event": Object {
                  "action": "case_user_action_delete_case_tags",
                  "category": Array [
                    "database",
                  ],
                  "outcome": "success",
                  "type": Array [
                    "deletion",
                  ],
                },
                "kibana": Object {
                  "saved_object": Object {
                    "id": "1",
                    "type": "cases",
                  },
                },
                "message": "User deleted tags in case id: 1 - user action id: 1",
              },
            ],
          ]
        `);
      });
    });

    describe('bulkCreateAttachmentDeletion', () => {
      it('creates delete comment user action', async () => {
        await service.creator.bulkCreateAttachmentDeletion({
          ...commonArgs,
          attachments,
        });
        expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledWith(
          [
            {
              attributes: {
                action: 'delete',
                created_at: '2022-01-09T22:00:00.000Z',
                created_by: {
                  email: 'elastic@elastic.co',
                  full_name: 'Elastic User',
                  username: 'elastic',
                },
                type: 'comment',
                owner: 'securitySolution',
                payload: {
                  comment: { comment: 'a comment', owner: 'securitySolution', type: 'user' },
                },
              },
              references: [
                { id: '123', name: 'associated-cases', type: 'cases' },
                { id: '1', name: 'associated-cases-comments', type: 'cases-comments' },
              ],
              type: 'cases-user-actions',
            },
            {
              attributes: {
                action: 'delete',
                created_at: '2022-01-09T22:00:00.000Z',
                created_by: {
                  email: 'elastic@elastic.co',
                  full_name: 'Elastic User',
                  username: 'elastic',
                },
                type: 'comment',
                owner: 'securitySolution',
                payload: {
                  comment: {
                    alertId: 'alert-id-1',
                    index: 'alert-index-1',
                    owner: 'securitySolution',
                    rule: { id: 'rule-id-1', name: 'rule-name-1' },
                    type: 'alert',
                  },
                },
              },
              references: [
                { id: '123', name: 'associated-cases', type: 'cases' },
                { id: '2', name: 'associated-cases-comments', type: 'cases-comments' },
              ],
              type: 'cases-user-actions',
            },
          ],
          { refresh: undefined }
        );
      });

      it('logs delete comment user action', async () => {
        await service.creator.bulkCreateAttachmentDeletion({
          ...commonArgs,
          attachments,
        });

        expect(mockAuditLogger.log).toBeCalledTimes(2);
        expect(mockAuditLogger.log.mock.calls).toMatchInlineSnapshot(`
          Array [
            Array [
              Object {
                "event": Object {
                  "action": "case_user_action_delete_comment",
                  "category": Array [
                    "database",
                  ],
                  "outcome": "success",
                  "type": Array [
                    "deletion",
                  ],
                },
                "kibana": Object {
                  "saved_object": Object {
                    "id": "1",
                    "type": "cases-comments",
                  },
                },
                "message": "User deleted comment id: 1 for case id: 123 - user action id: 0",
              },
            ],
            Array [
              Object {
                "event": Object {
                  "action": "case_user_action_delete_comment",
                  "category": Array [
                    "database",
                  ],
                  "outcome": "success",
                  "type": Array [
                    "deletion",
                  ],
                },
                "kibana": Object {
                  "saved_object": Object {
                    "id": "2",
                    "type": "cases-comments",
                  },
                },
                "message": "User deleted comment id: 2 for case id: 123 - user action id: 1",
              },
            ],
          ]
        `);
      });
    });

    describe('getUniqueConnectors', () => {
      const findResponse = createUserActionFindSO(createConnectorUserAction());
      const aggregationResponse = {
        aggregations: {
          references: {
            doc_count: 8,
            connectors: {
              doc_count: 4,
              ids: {
                doc_count_error_upper_bound: 0,
                sum_other_doc_count: 0,
                buckets: [
                  {
                    key: '865b6040-7533-11ec-8bcc-a9fc6f9d63b2',
                    doc_count: 2,
                    docs: {},
                  },
                  {
                    key: '915c2600-7533-11ec-8bcc-a9fc6f9d63b2',
                    doc_count: 1,
                    docs: {},
                  },
                  {
                    key: 'b2635b10-63e1-11ec-90af-6fe7d490ff66',
                    doc_count: 1,
                    docs: {},
                  },
                ],
              },
            },
          },
        },
      };

      beforeAll(() => {
        unsecuredSavedObjectsClient.find.mockResolvedValue(
          findResponse as unknown as Promise<SavedObjectsFindResponse>
        );
      });

      beforeEach(() => {
        jest.clearAllMocks();
      });

      it('it returns an empty array if the response is not valid', async () => {
        const res = await service.getUniqueConnectors({
          caseId: '123',
        });

        expect(res).toEqual([]);
      });

      it('it returns the connectors', async () => {
        unsecuredSavedObjectsClient.find.mockResolvedValue({
          ...findResponse,
          ...aggregationResponse,
        } as unknown as Promise<SavedObjectsFindResponse>);

        const res = await service.getUniqueConnectors({
          caseId: '123',
        });

        expect(res).toEqual([
          { id: '865b6040-7533-11ec-8bcc-a9fc6f9d63b2' },
          { id: '915c2600-7533-11ec-8bcc-a9fc6f9d63b2' },
          { id: 'b2635b10-63e1-11ec-90af-6fe7d490ff66' },
        ]);
      });

      it('it returns the unique connectors', async () => {
        await service.getUniqueConnectors({
          caseId: '123',
        });

        expect(unsecuredSavedObjectsClient.find.mock.calls[0]).toMatchInlineSnapshot(`
          Array [
            Object {
              "aggs": Object {
                "references": Object {
                  "aggregations": Object {
                    "connectors": Object {
                      "aggregations": Object {
                        "ids": Object {
                          "terms": Object {
                            "field": "cases-user-actions.references.id",
                            "size": 100,
                          },
                        },
                      },
                      "filter": Object {
                        "term": Object {
                          "cases-user-actions.references.type": "action",
                        },
                      },
                    },
                  },
                  "nested": Object {
                    "path": "cases-user-actions.references",
                  },
                },
              },
              "filter": Object {
                "arguments": Array [
                  Object {
                    "arguments": Array [
                      Object {
                        "isQuoted": false,
                        "type": "literal",
                        "value": "cases-user-actions.attributes.type",
                      },
                      Object {
                        "isQuoted": false,
                        "type": "literal",
                        "value": "connector",
                      },
                    ],
                    "function": "is",
                    "type": "function",
                  },
                  Object {
                    "arguments": Array [
                      Object {
                        "isQuoted": false,
                        "type": "literal",
                        "value": "cases-user-actions.attributes.type",
                      },
                      Object {
                        "isQuoted": false,
                        "type": "literal",
                        "value": "create_case",
                      },
                    ],
                    "function": "is",
                    "type": "function",
                  },
                ],
                "function": "or",
                "type": "function",
              },
              "hasReference": Object {
                "id": "123",
                "type": "cases",
              },
              "page": 1,
              "perPage": 1,
              "sortField": "created_at",
              "type": "cases-user-actions",
            },
          ]
        `);
      });
    });
  });
});
