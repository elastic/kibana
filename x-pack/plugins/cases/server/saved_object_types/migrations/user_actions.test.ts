/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import { SavedObjectSanitizedDoc } from 'kibana/server';
import {
  CaseConnector,
  CaseUserActionAttributes,
  CASE_USER_ACTION_SAVED_OBJECT,
} from '../../../common';
import { getNoneCaseConnector } from '../../common';
import { createExternalService, createJiraConnector } from '../../services/test_utils';
import {
  extractConnectorIdFromJson,
  UserActionFieldType,
  userActionsConnectorIdMigration,
} from './user_actions';

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
      new_value: typeof new_value === 'object' ? JSON.stringify(new_value) : new_value,
      old_value: typeof old_value === 'object' ? JSON.stringify(old_value) : old_value,
    },
  };
};

const createConnectorObject = (overrides?: Partial<CaseConnector>) => ({
  connector: { ...createJiraConnector(), ...(overrides && { ...overrides }) },
});

describe('user action migrations', () => {
  describe('7.15.0 connector ID migration', () => {
    describe('userActionsConnectorIdMigration', () => {
      describe('push user action', () => {
        it('extracts the external_service connector_id to references for a new pushed user action', () => {
          const userAction = create_7_14_0_userAction({
            action: 'push-to-service',
            action_field: ['pushed'],
            new_value: createExternalService(),
            old_value: null,
          });

          const migratedUserAction = userActionsConnectorIdMigration(
            userAction
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
        });

        it('extract the external_service connector_id to references for new and old pushed user action', () => {
          const userAction = create_7_14_0_userAction({
            action: 'push-to-service',
            action_field: ['pushed'],
            new_value: createExternalService(),
            old_value: createExternalService({ connector_id: '5' }),
          });

          const migratedUserAction = userActionsConnectorIdMigration(
            userAction
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
            userAction
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
            userAction
          ) as SavedObjectSanitizedDoc<CaseUserActionAttributes>;

          expect(migratedUserAction).toMatchInlineSnapshot(`
            Object {
              "attributes": Object {
                "action": "push-to-service",
                "action_field": Array [
                  "invalid field",
                ],
                "new_value": "hello",
                "old_value": "null",
              },
              "id": "1",
              "references": Array [],
              "type": "cases-user-actions",
            }
          `);
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
            userAction
          ) as SavedObjectSanitizedDoc<CaseUserActionAttributes>;

          const parsedConnector = JSON.parse(migratedUserAction.attributes.new_value!);
          expect(parsedConnector).not.toHaveProperty('id');
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
        });

        it('extracts the connector id to references for a new and old create connector user action', () => {
          const userAction = create_7_14_0_userAction({
            action: 'create',
            action_field: ['connector'],
            new_value: createConnectorObject(),
            old_value: createConnectorObject({ id: '5' }),
          });

          const migratedUserAction = userActionsConnectorIdMigration(
            userAction
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
              action: 'create',
              action_field: ['connector'],
              new_value: createConnectorObject(),
              old_value: createConnectorObject({ id: '5' }),
            }),
            references: [{ id: '500', name: 'someReference', type: 'ref' }],
          };

          const migratedUserAction = userActionsConnectorIdMigration(
            userAction
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
            userAction
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
      });
    });

    describe('extractConnectorIdFromJson', () => {
      describe('fails to extract the id', () => {
        it('returns no references and null transformed json when action is undefined', () => {
          expect(
            extractConnectorIdFromJson({
              actionFields: [],
              stringifiedJson: undefined,
              fieldType: UserActionFieldType.New,
            })
          ).toEqual({
            transformedJson: undefined,
            references: [],
          });
        });

        it('returns no references and undefined transformed json when actionFields is undefined', () => {
          expect(
            extractConnectorIdFromJson({ action: 'a', fieldType: UserActionFieldType.New })
          ).toEqual({
            transformedJson: undefined,
            references: [],
          });
        });

        it('returns no references and undefined transformed json when stringifiedJson is undefined', () => {
          expect(
            extractConnectorIdFromJson({
              action: 'a',
              actionFields: [],
              fieldType: UserActionFieldType.New,
            })
          ).toEqual({
            transformedJson: undefined,
            references: [],
          });
        });

        it('returns no references and undefined transformed json when stringifiedJson is null', () => {
          expect(
            extractConnectorIdFromJson({
              stringifiedJson: null,
              fieldType: UserActionFieldType.New,
            })
          ).toEqual({
            transformedJson: null,
            references: [],
          });
        });

        it('returns no references and undefined transformed json when stringifiedJson is invalid json', () => {
          expect(
            extractConnectorIdFromJson({
              stringifiedJson: 'a',
              fieldType: UserActionFieldType.New,
            })
          ).toEqual({
            transformedJson: 'a',
            references: [],
          });
        });
      });

      describe('create action', () => {
        it('returns no references and untransformed json when stringifiedJson is not a valid connector', () => {
          expect(
            extractConnectorIdFromJson({
              action: 'create',
              actionFields: ['connector'],
              stringifiedJson: JSON.stringify({ a: 'hello' }),
              fieldType: UserActionFieldType.New,
            })
          ).toMatchInlineSnapshot(`
            Object {
              "references": Array [],
              "transformedJson": "{\\"a\\":\\"hello\\"}",
            }
          `);
        });

        it('returns no references and untransformed json when the action is create and action fields does not contain connector', () => {
          expect(
            extractConnectorIdFromJson({
              action: 'create',
              actionFields: ['', 'something', 'onnector'],
              stringifiedJson: 'hello',
              fieldType: UserActionFieldType.New,
            })
          ).toMatchInlineSnapshot(`
            Object {
              "references": Array [],
              "transformedJson": "hello",
            }
          `);
        });

        it('returns the stringified json without the id', () => {
          const jiraConnector = createConnectorObject();

          const { transformedJson } = extractConnectorIdFromJson({
            action: 'create',
            actionFields: ['connector'],
            stringifiedJson: JSON.stringify(jiraConnector),
            fieldType: UserActionFieldType.New,
          });

          expect(JSON.parse(transformedJson!)).toMatchInlineSnapshot(`
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
        });

        it('removes the connector.id when the connector is none', () => {
          const connector = { connector: getNoneCaseConnector() };

          const { transformedJson } = extractConnectorIdFromJson({
            action: 'create',
            actionFields: ['connector'],
            stringifiedJson: JSON.stringify(connector),
            fieldType: UserActionFieldType.New,
          })!;

          const parsedJson = JSON.parse(transformedJson!);

          expect(parsedJson.connector).not.toHaveProperty('id');
          expect(parsedJson).toMatchInlineSnapshot(`
            Object {
              "connector": Object {
                "fields": null,
                "name": "none",
                "type": ".none",
              },
            }
          `);
        });

        it('does not return a reference when the connector is none', () => {
          const connector = { connector: getNoneCaseConnector() };

          const { references } = extractConnectorIdFromJson({
            action: 'create',
            actionFields: ['connector'],
            stringifiedJson: JSON.stringify(connector),
            fieldType: UserActionFieldType.New,
          })!;

          expect(references).toEqual([]);
        });

        it('returns a reference to the connector.id', () => {
          const jiraConnector = createConnectorObject();

          const { references } = extractConnectorIdFromJson({
            action: 'create',
            actionFields: ['connector'],
            stringifiedJson: JSON.stringify(jiraConnector),
            fieldType: UserActionFieldType.New,
          })!;

          expect(references).toMatchInlineSnapshot(`
            Array [
              Object {
                "id": "1",
                "name": "connectorId",
                "type": "action",
              },
            ]
          `);
        });

        it('returns an old reference name to the connector.id', () => {
          const jiraConnector = createConnectorObject();

          const { references } = extractConnectorIdFromJson({
            action: 'create',
            actionFields: ['connector'],
            stringifiedJson: JSON.stringify(jiraConnector),
            fieldType: UserActionFieldType.Old,
          })!;

          expect(references).toMatchInlineSnapshot(`
            Array [
              Object {
                "id": "1",
                "name": "oldConnectorId",
                "type": "action",
              },
            ]
          `);
        });
      });

      describe('update action', () => {
        it('returns no references and untransformed json when stringifiedJson is not a valid connector', () => {
          expect(
            extractConnectorIdFromJson({
              action: 'update',
              actionFields: ['connector'],
              stringifiedJson: JSON.stringify({ a: 'hello' }),
              fieldType: UserActionFieldType.New,
            })
          ).toMatchInlineSnapshot(`
            Object {
              "references": Array [],
              "transformedJson": "{\\"a\\":\\"hello\\"}",
            }
          `);
        });

        it('returns no references and untransformed json when the action is update and action fields does not contain connector', () => {
          expect(
            extractConnectorIdFromJson({
              action: 'update',
              actionFields: ['', 'something', 'onnector'],
              stringifiedJson: 'hello',
              fieldType: UserActionFieldType.New,
            })
          ).toMatchInlineSnapshot(`
            Object {
              "references": Array [],
              "transformedJson": "hello",
            }
          `);
        });

        it('returns the stringified json without the id', () => {
          const jiraConnector = createJiraConnector();

          const { transformedJson } = extractConnectorIdFromJson({
            action: 'update',
            actionFields: ['connector'],
            stringifiedJson: JSON.stringify(jiraConnector),
            fieldType: UserActionFieldType.New,
          });

          const transformedConnetor = JSON.parse(transformedJson!);
          expect(transformedConnetor).not.toHaveProperty('id');
          expect(transformedConnetor).toMatchInlineSnapshot(`
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
        });

        it('returns the stringified json without the id when the connector is none', () => {
          const connector = getNoneCaseConnector();

          const { transformedJson } = extractConnectorIdFromJson({
            action: 'update',
            actionFields: ['connector'],
            stringifiedJson: JSON.stringify(connector),
            fieldType: UserActionFieldType.New,
          });

          const transformedConnetor = JSON.parse(transformedJson!);
          expect(transformedConnetor).not.toHaveProperty('id');
          expect(transformedConnetor).toMatchInlineSnapshot(`
            Object {
              "fields": null,
              "name": "none",
              "type": ".none",
            }
          `);
        });

        it('returns a reference to the connector.id', () => {
          const jiraConnector = createJiraConnector();

          const { references } = extractConnectorIdFromJson({
            action: 'update',
            actionFields: ['connector'],
            stringifiedJson: JSON.stringify(jiraConnector),
            fieldType: UserActionFieldType.New,
          })!;

          expect(references).toMatchInlineSnapshot(`
            Array [
              Object {
                "id": "1",
                "name": "connectorId",
                "type": "action",
              },
            ]
          `);
        });

        it('does not return a reference when the connector is none', () => {
          const connector = getNoneCaseConnector();

          const { references } = extractConnectorIdFromJson({
            action: 'update',
            actionFields: ['connector'],
            stringifiedJson: JSON.stringify(connector),
            fieldType: UserActionFieldType.New,
          })!;

          expect(references).toEqual([]);
        });

        it('returns an old reference name to the connector.id', () => {
          const jiraConnector = createJiraConnector();

          const { references } = extractConnectorIdFromJson({
            action: 'update',
            actionFields: ['connector'],
            stringifiedJson: JSON.stringify(jiraConnector),
            fieldType: UserActionFieldType.Old,
          })!;

          expect(references).toMatchInlineSnapshot(`
            Array [
              Object {
                "id": "1",
                "name": "oldConnectorId",
                "type": "action",
              },
            ]
          `);
        });
      });

      describe('push action', () => {
        it('returns no references and untransformed json when stringifiedJson is not a valid external_service', () => {
          expect(
            extractConnectorIdFromJson({
              action: 'push-to-service',
              actionFields: ['pushed'],
              stringifiedJson: JSON.stringify({ a: 'hello' }),
              fieldType: UserActionFieldType.New,
            })
          ).toMatchInlineSnapshot(`
            Object {
              "references": Array [],
              "transformedJson": "{\\"a\\":\\"hello\\"}",
            }
          `);
        });

        it('returns no references and untransformed json when the action is push-to-service and action fields does not contain pushed', () => {
          expect(
            extractConnectorIdFromJson({
              action: 'push-to-service',
              actionFields: ['', 'something', 'ushed'],
              stringifiedJson: JSON.stringify({ a: 'hello' }),
              fieldType: UserActionFieldType.New,
            })
          ).toMatchInlineSnapshot(`
            Object {
              "references": Array [],
              "transformedJson": "{\\"a\\":\\"hello\\"}",
            }
          `);
        });

        it('returns the stringified json without the connector_id', () => {
          const externalService = createExternalService();

          const { transformedJson } = extractConnectorIdFromJson({
            action: 'push-to-service',
            actionFields: ['pushed'],
            stringifiedJson: JSON.stringify(externalService),
            fieldType: UserActionFieldType.New,
          });

          const transformedExternalService = JSON.parse(transformedJson!);
          expect(transformedExternalService).not.toHaveProperty('connector_id');
          expect(transformedExternalService).toMatchInlineSnapshot(`
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
        });

        it('returns a reference to the connector_id', () => {
          const externalService = createExternalService();

          const { references } = extractConnectorIdFromJson({
            action: 'push-to-service',
            actionFields: ['pushed'],
            stringifiedJson: JSON.stringify(externalService),
            fieldType: UserActionFieldType.New,
          })!;

          expect(references).toMatchInlineSnapshot(`
            Array [
              Object {
                "id": "100",
                "name": "pushConnectorId",
                "type": "action",
              },
            ]
          `);
        });

        it('returns an old reference name to the connector_id', () => {
          const externalService = createExternalService();

          const { references } = extractConnectorIdFromJson({
            action: 'push-to-service',
            actionFields: ['pushed'],
            stringifiedJson: JSON.stringify(externalService),
            fieldType: UserActionFieldType.Old,
          })!;

          expect(references).toMatchInlineSnapshot(`
            Array [
              Object {
                "id": "100",
                "name": "oldPushConnectorId",
                "type": "action",
              },
            ]
          `);
        });
      });
    });
  });
});
