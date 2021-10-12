/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UserActionField } from '../../../common';
import { createConnectorObject, createExternalService, createJiraConnector } from '../test_utils';
import { buildCaseUserActionItem } from './helpers';

const defaultFields = () => ({
  actionAt: 'now',
  actionBy: {
    email: 'a',
    full_name: 'j',
    username: '1',
  },
  caseId: '300',
  owner: 'securitySolution',
});

describe('user action helpers', () => {
  describe('buildCaseUserActionItem', () => {
    describe('push user action', () => {
      it('extracts the external_service connector_id to references for a new pushed user action', () => {
        const userAction = buildCaseUserActionItem({
          ...defaultFields(),
          action: 'push-to-service',
          fields: ['pushed'],
          newValue: createExternalService(),
        });

        const parsedExternalService = JSON.parse(userAction.attributes.new_value!);
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

        expect(userAction.references).toMatchInlineSnapshot(`
          Array [
            Object {
              "id": "300",
              "name": "associated-cases",
              "type": "cases",
            },
            Object {
              "id": "100",
              "name": "pushConnectorId",
              "type": "action",
            },
          ]
        `);

        expect(userAction.attributes.old_value).toBeNull();
      });

      it('extract the external_service connector_id to references for new and old pushed user action', () => {
        const userAction = buildCaseUserActionItem({
          ...defaultFields(),
          action: 'push-to-service',
          fields: ['pushed'],
          newValue: createExternalService(),
          oldValue: createExternalService({ connector_id: '5' }),
        });

        const parsedNewExternalService = JSON.parse(userAction.attributes.new_value!);
        const parsedOldExternalService = JSON.parse(userAction.attributes.old_value!);

        expect(parsedNewExternalService).not.toHaveProperty('connector_id');
        expect(parsedOldExternalService).not.toHaveProperty('connector_id');
        expect(userAction.references).toEqual([
          { id: '300', name: 'associated-cases', type: 'cases' },
          { id: '100', name: 'pushConnectorId', type: 'action' },
          { id: '5', name: 'oldPushConnectorId', type: 'action' },
        ]);
      });

      it('leaves the object unmodified when it is not a valid push user action', () => {
        const userAction = buildCaseUserActionItem({
          ...defaultFields(),
          action: 'push-to-service',
          fields: ['invalid field'] as unknown as UserActionField,
          newValue: 'hello' as unknown as Record<string, unknown>,
        });

        expect(userAction.attributes.old_value).toBeNull();
        expect(userAction).toMatchInlineSnapshot(`
          Object {
            "attributes": Object {
              "action": "push-to-service",
              "action_at": "now",
              "action_by": Object {
                "email": "a",
                "full_name": "j",
                "username": "1",
              },
              "action_field": Array [
                "invalid field",
              ],
              "new_value": "hello",
              "old_value": null,
              "owner": "securitySolution",
            },
            "references": Array [
              Object {
                "id": "300",
                "name": "associated-cases",
                "type": "cases",
              },
            ],
          }
        `);
      });
    });

    describe('update connector user action', () => {
      it('extracts the connector id to references for a new create connector user action', () => {
        const userAction = buildCaseUserActionItem({
          ...defaultFields(),
          action: 'update',
          fields: ['connector'],
          newValue: createJiraConnector(),
        });

        const parsedConnector = JSON.parse(userAction.attributes.new_value!);
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

        expect(userAction.references).toMatchInlineSnapshot(`
          Array [
            Object {
              "id": "300",
              "name": "associated-cases",
              "type": "cases",
            },
            Object {
              "id": "1",
              "name": "connectorId",
              "type": "action",
            },
          ]
        `);

        expect(userAction.attributes.old_value).toBeNull();
      });

      it('extracts the connector id to references for a new and old create connector user action', () => {
        const userAction = buildCaseUserActionItem({
          ...defaultFields(),
          action: 'update',
          fields: ['connector'],
          newValue: createJiraConnector(),
          oldValue: { ...createJiraConnector(), id: '5' },
        });

        const parsedNewConnector = JSON.parse(userAction.attributes.new_value!);
        const parsedOldConnector = JSON.parse(userAction.attributes.new_value!);

        expect(parsedNewConnector).not.toHaveProperty('id');
        expect(parsedOldConnector).not.toHaveProperty('id');

        expect(userAction.references).toEqual([
          { id: '300', name: 'associated-cases', type: 'cases' },
          { id: '1', name: 'connectorId', type: 'action' },
          { id: '5', name: 'oldConnectorId', type: 'action' },
        ]);
      });

      it('leaves the object unmodified when it is not a valid create connector user action', () => {
        const userAction = buildCaseUserActionItem({
          ...defaultFields(),
          action: 'update',
          fields: ['invalid field'] as unknown as UserActionField,
          newValue: 'hello' as unknown as Record<string, unknown>,
          oldValue: 'old value' as unknown as Record<string, unknown>,
        });

        expect(userAction).toMatchInlineSnapshot(`
          Object {
            "attributes": Object {
              "action": "update",
              "action_at": "now",
              "action_by": Object {
                "email": "a",
                "full_name": "j",
                "username": "1",
              },
              "action_field": Array [
                "invalid field",
              ],
              "new_value": "hello",
              "old_value": "old value",
              "owner": "securitySolution",
            },
            "references": Array [
              Object {
                "id": "300",
                "name": "associated-cases",
                "type": "cases",
              },
            ],
          }
        `);
      });
    });

    describe('create connector user action', () => {
      it('extracts the connector id to references for a new create connector user action', () => {
        const userAction = buildCaseUserActionItem({
          ...defaultFields(),
          action: 'create',
          fields: ['connector'],
          newValue: createConnectorObject(),
        });

        const parsedConnector = JSON.parse(userAction.attributes.new_value!);
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

        expect(userAction.references).toMatchInlineSnapshot(`
          Array [
            Object {
              "id": "300",
              "name": "associated-cases",
              "type": "cases",
            },
            Object {
              "id": "1",
              "name": "connectorId",
              "type": "action",
            },
          ]
        `);

        expect(userAction.attributes.old_value).toBeNull();
      });

      it('extracts the connector id to references for a new and old create connector user action', () => {
        const userAction = buildCaseUserActionItem({
          ...defaultFields(),
          action: 'create',
          fields: ['connector'],
          newValue: createConnectorObject(),
          oldValue: createConnectorObject({ id: '5' }),
        });

        const parsedNewConnector = JSON.parse(userAction.attributes.new_value!);
        const parsedOldConnector = JSON.parse(userAction.attributes.new_value!);

        expect(parsedNewConnector.connector).not.toHaveProperty('id');
        expect(parsedOldConnector.connector).not.toHaveProperty('id');

        expect(userAction.references).toEqual([
          { id: '300', name: 'associated-cases', type: 'cases' },
          { id: '1', name: 'connectorId', type: 'action' },
          { id: '5', name: 'oldConnectorId', type: 'action' },
        ]);
      });

      it('leaves the object unmodified when it is not a valid create connector user action', () => {
        const userAction = buildCaseUserActionItem({
          ...defaultFields(),
          action: 'create',
          fields: ['invalid action'] as unknown as UserActionField,
          newValue: 'new json value' as unknown as Record<string, unknown>,
          oldValue: 'old value' as unknown as Record<string, unknown>,
        });

        expect(userAction).toMatchInlineSnapshot(`
          Object {
            "attributes": Object {
              "action": "create",
              "action_at": "now",
              "action_by": Object {
                "email": "a",
                "full_name": "j",
                "username": "1",
              },
              "action_field": Array [
                "invalid action",
              ],
              "new_value": "new json value",
              "old_value": "old value",
              "owner": "securitySolution",
            },
            "references": Array [
              Object {
                "id": "300",
                "name": "associated-cases",
                "type": "cases",
              },
            ],
          }
        `);
      });
    });
  });
});
