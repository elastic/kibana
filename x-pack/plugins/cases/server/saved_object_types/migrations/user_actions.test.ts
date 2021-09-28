/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import { SavedObjectMigrationContext, SavedObjectSanitizedDoc } from 'kibana/server';
import { migrationMocks } from 'src/core/server/mocks';
import { CaseUserActionAttributes, CASE_USER_ACTION_SAVED_OBJECT } from '../../../common';
import {
  createConnectorObject,
  createExternalService,
  createJiraConnector,
} from '../../services/test_utils';
import { userActionsConnectorIdMigration } from './user_actions';

const create_7_14_0_userAction = (
  params: {
    action?: string;
    action_field?: string[];
    new_value?: string | null | object;
    old_value?: string | null | object;
  } = {}
) => {
  const { new_value, old_value, ...restParams } = params;

  return {
    type: CASE_USER_ACTION_SAVED_OBJECT,
    id: '1',
    attributes: {
      ...restParams,
      new_value: new_value && typeof new_value === 'object' ? JSON.stringify(new_value) : new_value,
      old_value: old_value && typeof old_value === 'object' ? JSON.stringify(old_value) : old_value,
    },
  };
};

describe('user action migrations', () => {
  describe('7.15.0 connector ID migration', () => {
    describe('userActionsConnectorIdMigration', () => {
      let context: jest.Mocked<SavedObjectMigrationContext>;

      beforeEach(() => {
        context = migrationMocks.createContext();
      });

      describe('push user action', () => {
        it('extracts the external_service connector_id to references for a new pushed user action', () => {
          const userAction = create_7_14_0_userAction({
            action: 'push-to-service',
            action_field: ['pushed'],
            new_value: createExternalService(),
            old_value: null,
          });

          const migratedUserAction = userActionsConnectorIdMigration(
            userAction,
            context
          ) as SavedObjectSanitizedDoc<CaseUserActionAttributes>;

          const parsedExternalService = JSON.parse(migratedUserAction.attributes.new_value!);
          expect(parsedExternalService).not.toHaveProperty('connector_id');
          expect(parsedExternalService).toMatchInlineSnapshot(`
            Object {
              "connector_name": ".jira",
              "external_id": "100",
              "external_title": "awesome",
              "external_url": "http://www.google.com",
              "pushed_at": "2019-11-25T21:54:48.952Z",
              "pushed_by": Object {
                "email": "testemail@elastic.co",
                "full_name": "elastic",
                "username": "elastic",
              },
            }
          `);

          expect(migratedUserAction.references).toMatchInlineSnapshot(`
            Array [
              Object {
                "id": "100",
                "name": "pushConnectorId",
                "type": "action",
              },
            ]
          `);

          expect(migratedUserAction.attributes.old_value).toBeNull();
        });

        it('extract the external_service connector_id to references for new and old pushed user action', () => {
          const userAction = create_7_14_0_userAction({
            action: 'push-to-service',
            action_field: ['pushed'],
            new_value: createExternalService(),
            old_value: createExternalService({ connector_id: '5' }),
          });

          const migratedUserAction = userActionsConnectorIdMigration(
            userAction,
            context
          ) as SavedObjectSanitizedDoc<CaseUserActionAttributes>;

          const parsedNewExternalService = JSON.parse(migratedUserAction.attributes.new_value!);
          const parsedOldExternalService = JSON.parse(migratedUserAction.attributes.old_value!);

          expect(parsedNewExternalService).not.toHaveProperty('connector_id');
          expect(parsedOldExternalService).not.toHaveProperty('connector_id');
          expect(migratedUserAction.references).toEqual([
            { id: '100', name: 'pushConnectorId', type: 'action' },
            { id: '5', name: 'oldPushConnectorId', type: 'action' },
          ]);
        });

        it('preserves the existing references after extracting the external_service connector_id field', () => {
          const userAction = {
            ...create_7_14_0_userAction({
              action: 'push-to-service',
              action_field: ['pushed'],
              new_value: createExternalService(),
              old_value: createExternalService({ connector_id: '5' }),
            }),
            references: [{ id: '500', name: 'someReference', type: 'ref' }],
          };

          const migratedUserAction = userActionsConnectorIdMigration(
            userAction,
            context
          ) as SavedObjectSanitizedDoc<CaseUserActionAttributes>;

          const parsedNewExternalService = JSON.parse(migratedUserAction.attributes.new_value!);
          const parsedOldExternalService = JSON.parse(migratedUserAction.attributes.old_value!);

          expect(parsedNewExternalService).not.toHaveProperty('connector_id');
          expect(parsedOldExternalService).not.toHaveProperty('connector_id');
          expect(migratedUserAction.references).toEqual([
            { id: '500', name: 'someReference', type: 'ref' },
            { id: '100', name: 'pushConnectorId', type: 'action' },
            { id: '5', name: 'oldPushConnectorId', type: 'action' },
          ]);
        });

        it('leaves the object unmodified when it is not a valid push user action', () => {
          const userAction = create_7_14_0_userAction({
            action: 'push-to-service',
            action_field: ['invalid field'],
            new_value: 'hello',
            old_value: null,
          });

          const migratedUserAction = userActionsConnectorIdMigration(
            userAction,
            context
          ) as SavedObjectSanitizedDoc<CaseUserActionAttributes>;

          expect(migratedUserAction.attributes.old_value).toBeNull();
          expect(migratedUserAction).toMatchInlineSnapshot(`
            Object {
              "attributes": Object {
                "action": "push-to-service",
                "action_field": Array [
                  "invalid field",
                ],
                "new_value": "hello",
                "old_value": null,
              },
              "id": "1",
              "references": Array [],
              "type": "cases-user-actions",
            }
          `);
        });

        it('leaves the object unmodified when it new value is invalid json', () => {
          const userAction = create_7_14_0_userAction({
            action: 'push-to-service',
            action_field: ['pushed'],
            new_value: '{a',
            old_value: null,
          });

          const migratedUserAction = userActionsConnectorIdMigration(
            userAction,
            context
          ) as SavedObjectSanitizedDoc<CaseUserActionAttributes>;

          expect(migratedUserAction.attributes.old_value).toBeNull();
          expect(migratedUserAction.attributes.new_value).toEqual('{a');
          expect(migratedUserAction).toMatchInlineSnapshot(`
            Object {
              "attributes": Object {
                "action": "push-to-service",
                "action_field": Array [
                  "pushed",
                ],
                "new_value": "{a",
                "old_value": null,
              },
              "id": "1",
              "references": Array [],
              "type": "cases-user-actions",
            }
          `);
        });

        it('logs an error new value is invalid json', () => {
          const userAction = create_7_14_0_userAction({
            action: 'push-to-service',
            action_field: ['pushed'],
            new_value: '{a',
            old_value: null,
          });

          userActionsConnectorIdMigration(userAction, context);

          expect(context.log.error).toHaveBeenCalled();
        });
      });

      describe('update connector user action', () => {
        it('extracts the connector id to references for a new create connector user action', () => {
          const userAction = create_7_14_0_userAction({
            action: 'update',
            action_field: ['connector'],
            new_value: createJiraConnector(),
            old_value: null,
          });

          const migratedUserAction = userActionsConnectorIdMigration(
            userAction,
            context
          ) as SavedObjectSanitizedDoc<CaseUserActionAttributes>;

          const parsedConnector = JSON.parse(migratedUserAction.attributes.new_value!);
          expect(parsedConnector).not.toHaveProperty('id');
          expect(parsedConnector).toMatchInlineSnapshot(`
            Object {
              "fields": Object {
                "issueType": "bug",
                "parent": "2",
                "priority": "high",
              },
              "name": ".jira",
              "type": ".jira",
            }
          `);

          expect(migratedUserAction.references).toMatchInlineSnapshot(`
            Array [
              Object {
                "id": "1",
                "name": "connectorId",
                "type": "action",
              },
            ]
          `);

          expect(migratedUserAction.attributes.old_value).toBeNull();
        });

        it('extracts the connector id to references for a new and old create connector user action', () => {
          const userAction = create_7_14_0_userAction({
            action: 'update',
            action_field: ['connector'],
            new_value: createJiraConnector(),
            old_value: { ...createJiraConnector(), id: '5' },
          });

          const migratedUserAction = userActionsConnectorIdMigration(
            userAction,
            context
          ) as SavedObjectSanitizedDoc<CaseUserActionAttributes>;

          const parsedNewConnector = JSON.parse(migratedUserAction.attributes.new_value!);
          const parsedOldConnector = JSON.parse(migratedUserAction.attributes.new_value!);

          expect(parsedNewConnector).not.toHaveProperty('id');
          expect(parsedOldConnector).not.toHaveProperty('id');

          expect(migratedUserAction.references).toEqual([
            { id: '1', name: 'connectorId', type: 'action' },
            { id: '5', name: 'oldConnectorId', type: 'action' },
          ]);
        });

        it('preserves the existing references after extracting the connector.id field', () => {
          const userAction = {
            ...create_7_14_0_userAction({
              action: 'update',
              action_field: ['connector'],
              new_value: createJiraConnector(),
              old_value: { ...createJiraConnector(), id: '5' },
            }),
            references: [{ id: '500', name: 'someReference', type: 'ref' }],
          };

          const migratedUserAction = userActionsConnectorIdMigration(
            userAction,
            context
          ) as SavedObjectSanitizedDoc<CaseUserActionAttributes>;

          const parsedNewConnectorId = JSON.parse(migratedUserAction.attributes.new_value!);
          const parsedOldConnectorId = JSON.parse(migratedUserAction.attributes.old_value!);

          expect(parsedNewConnectorId).not.toHaveProperty('id');
          expect(parsedOldConnectorId).not.toHaveProperty('id');
          expect(migratedUserAction.references).toEqual([
            { id: '500', name: 'someReference', type: 'ref' },
            { id: '1', name: 'connectorId', type: 'action' },
            { id: '5', name: 'oldConnectorId', type: 'action' },
          ]);
        });

        it('leaves the object unmodified when it is not a valid create connector user action', () => {
          const userAction = create_7_14_0_userAction({
            action: 'update',
            action_field: ['invalid action'],
            new_value: 'new json value',
            old_value: 'old value',
          });

          const migratedUserAction = userActionsConnectorIdMigration(
            userAction,
            context
          ) as SavedObjectSanitizedDoc<CaseUserActionAttributes>;

          expect(migratedUserAction).toMatchInlineSnapshot(`
            Object {
              "attributes": Object {
                "action": "update",
                "action_field": Array [
                  "invalid action",
                ],
                "new_value": "new json value",
                "old_value": "old value",
              },
              "id": "1",
              "references": Array [],
              "type": "cases-user-actions",
            }
          `);
        });

        it('leaves the object unmodified when old_value is invalid json', () => {
          const userAction = create_7_14_0_userAction({
            action: 'update',
            action_field: ['connector'],
            new_value: '{}',
            old_value: '{b',
          });

          const migratedUserAction = userActionsConnectorIdMigration(
            userAction,
            context
          ) as SavedObjectSanitizedDoc<CaseUserActionAttributes>;

          expect(migratedUserAction).toMatchInlineSnapshot(`
            Object {
              "attributes": Object {
                "action": "update",
                "action_field": Array [
                  "connector",
                ],
                "new_value": "{}",
                "old_value": "{b",
              },
              "id": "1",
              "references": Array [],
              "type": "cases-user-actions",
            }
          `);
        });

        it('logs an error message when old_value is invalid json', () => {
          const userAction = create_7_14_0_userAction({
            action: 'update',
            action_field: ['connector'],
            new_value: createJiraConnector(),
            old_value: '{b',
          });

          userActionsConnectorIdMigration(userAction, context);

          expect(context.log.error).toHaveBeenCalled();
        });
      });

      describe('create connector user action', () => {
        it('extracts the connector id to references for a new create connector user action', () => {
          const userAction = create_7_14_0_userAction({
            action: 'create',
            action_field: ['connector'],
            new_value: createConnectorObject(),
            old_value: null,
          });

          const migratedUserAction = userActionsConnectorIdMigration(
            userAction,
            context
          ) as SavedObjectSanitizedDoc<CaseUserActionAttributes>;

          const parsedConnector = JSON.parse(migratedUserAction.attributes.new_value!);
          expect(parsedConnector.connector).not.toHaveProperty('id');
          expect(parsedConnector).toMatchInlineSnapshot(`
            Object {
              "connector": Object {
                "fields": Object {
                  "issueType": "bug",
                  "parent": "2",
                  "priority": "high",
                },
                "name": ".jira",
                "type": ".jira",
              },
            }
          `);

          expect(migratedUserAction.references).toMatchInlineSnapshot(`
            Array [
              Object {
                "id": "1",
                "name": "connectorId",
                "type": "action",
              },
            ]
          `);

          expect(migratedUserAction.attributes.old_value).toBeNull();
        });

        it('extracts the connector id to references for a new and old create connector user action', () => {
          const userAction = create_7_14_0_userAction({
            action: 'create',
            action_field: ['connector'],
            new_value: createConnectorObject(),
            old_value: createConnectorObject({ id: '5' }),
          });

          const migratedUserAction = userActionsConnectorIdMigration(
            userAction,
            context
          ) as SavedObjectSanitizedDoc<CaseUserActionAttributes>;

          const parsedNewConnector = JSON.parse(migratedUserAction.attributes.new_value!);
          const parsedOldConnector = JSON.parse(migratedUserAction.attributes.new_value!);

          expect(parsedNewConnector.connector).not.toHaveProperty('id');
          expect(parsedOldConnector.connector).not.toHaveProperty('id');

          expect(migratedUserAction.references).toEqual([
            { id: '1', name: 'connectorId', type: 'action' },
            { id: '5', name: 'oldConnectorId', type: 'action' },
          ]);
        });

        it('preserves the existing references after extracting the connector.id field', () => {
          const userAction = {
            ...create_7_14_0_userAction({
              action: 'create',
              action_field: ['connector'],
              new_value: createConnectorObject(),
              old_value: createConnectorObject({ id: '5' }),
            }),
            references: [{ id: '500', name: 'someReference', type: 'ref' }],
          };

          const migratedUserAction = userActionsConnectorIdMigration(
            userAction,
            context
          ) as SavedObjectSanitizedDoc<CaseUserActionAttributes>;

          const parsedNewConnectorId = JSON.parse(migratedUserAction.attributes.new_value!);
          const parsedOldConnectorId = JSON.parse(migratedUserAction.attributes.old_value!);

          expect(parsedNewConnectorId.connector).not.toHaveProperty('id');
          expect(parsedOldConnectorId.connector).not.toHaveProperty('id');
          expect(migratedUserAction.references).toEqual([
            { id: '500', name: 'someReference', type: 'ref' },
            { id: '1', name: 'connectorId', type: 'action' },
            { id: '5', name: 'oldConnectorId', type: 'action' },
          ]);
        });

        it('leaves the object unmodified when it is not a valid create connector user action', () => {
          const userAction = create_7_14_0_userAction({
            action: 'create',
            action_field: ['invalid action'],
            new_value: 'new json value',
            old_value: 'old value',
          });

          const migratedUserAction = userActionsConnectorIdMigration(
            userAction,
            context
          ) as SavedObjectSanitizedDoc<CaseUserActionAttributes>;

          expect(migratedUserAction).toMatchInlineSnapshot(`
            Object {
              "attributes": Object {
                "action": "create",
                "action_field": Array [
                  "invalid action",
                ],
                "new_value": "new json value",
                "old_value": "old value",
              },
              "id": "1",
              "references": Array [],
              "type": "cases-user-actions",
            }
          `);
        });

        it('leaves the object unmodified when new_value is invalid json', () => {
          const userAction = create_7_14_0_userAction({
            action: 'create',
            action_field: ['connector'],
            new_value: 'new json value',
            old_value: 'old value',
          });

          const migratedUserAction = userActionsConnectorIdMigration(
            userAction,
            context
          ) as SavedObjectSanitizedDoc<CaseUserActionAttributes>;

          expect(migratedUserAction).toMatchInlineSnapshot(`
            Object {
              "attributes": Object {
                "action": "create",
                "action_field": Array [
                  "connector",
                ],
                "new_value": "new json value",
                "old_value": "old value",
              },
              "id": "1",
              "references": Array [],
              "type": "cases-user-actions",
            }
          `);
        });

        it('logs an error message when new_value is invalid json', () => {
          const userAction = create_7_14_0_userAction({
            action: 'create',
            action_field: ['connector'],
            new_value: 'new json value',
            old_value: 'old value',
          });

          userActionsConnectorIdMigration(userAction, context);

          expect(context.log.error).toHaveBeenCalled();
        });
      });
    });
  });
});
