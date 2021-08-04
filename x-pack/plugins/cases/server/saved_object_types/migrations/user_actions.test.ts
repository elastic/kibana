/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import { SavedObjectSanitizedDoc } from 'kibana/server';
import { CaseUserActionAttributes, CASE_USER_ACTION_SAVED_OBJECT } from '../../../common';
import { createExternalService, createJiraConnector } from '../../services/test_utils';
import { extractConnectorIdFromJson, userActionsConnectorIdMigration } from './user_actions';

// TODO: change this so it accepts new_value as type string | null | undefined | CaseConnector | CaseFullExternalService
const create_7_14_0_userAction = (
  params: {
    action?: string;
    action_field?: string[];
    new_value?: string | null;
    old_value?: string | null;
  } = {}
) => ({
  type: CASE_USER_ACTION_SAVED_OBJECT,
  id: '1',
  attributes: {
    ...params,
  },
});

describe('user action migrations', () => {
  describe('7.15.0 connector ID migration', () => {
    describe('userActionsConnectorIdMigration', () => {
      it('extracts the connector.id to references for a create connector', () => {
        const userAction = create_7_14_0_userAction();

        const migratedUserAction = userActionsConnectorIdMigration(
          userAction
        ) as SavedObjectSanitizedDoc<CaseUserActionAttributes>;

        expect(JSON.parse(migratedUserAction.attributes.new_value!)).toMatchInlineSnapshot();
      });
    });

    describe('extractConnectorIdFromJson', () => {
      describe('returns undefined', () => {
        it('returns undefined when action is undefined', () => {
          expect(
            extractConnectorIdFromJson({ actionFields: [], stringifiedJson: null })
          ).toBeUndefined();
        });

        it('returns undefined when actionFields is undefined', () => {
          expect(extractConnectorIdFromJson({ action: 'a' })).toBeUndefined();
        });

        it('returns undefined when stringifiedJson is undefined', () => {
          expect(extractConnectorIdFromJson({ action: 'a', actionFields: [] })).toBeUndefined();
        });

        it('returns undefined when stringifiedJson is null', () => {
          expect(extractConnectorIdFromJson({ stringifiedJson: null })).toBeUndefined();
        });

        it('returns undefined when stringifiedJson is invalid json', () => {
          expect(extractConnectorIdFromJson({ stringifiedJson: 'a' })).toBeUndefined();
        });
      });

      describe('create action', () => {
        it('returns undefined when stringifiedJson is not a valid connector', () => {
          expect(
            extractConnectorIdFromJson({
              action: 'create',
              actionFields: ['connector'],
              stringifiedJson: JSON.stringify({ a: 'hello' }),
            })
          ).toBeUndefined();
        });

        it('returns undefined when the action is create and action fields does not contain connector', () => {
          const jiraConnector = { connector: createJiraConnector() };

          expect(
            extractConnectorIdFromJson({
              action: 'create',
              actionFields: ['', 'something', 'onnector'],
              stringifiedJson: JSON.stringify(jiraConnector),
            })
          ).toBeUndefined();
        });

        it('returns the stringified json without the id', () => {
          const jiraConnector = { connector: createJiraConnector() };

          const { transformedJson } = extractConnectorIdFromJson({
            action: 'create',
            actionFields: ['connector'],
            stringifiedJson: JSON.stringify(jiraConnector),
          })!;

          expect(JSON.parse(transformedJson)).toMatchInlineSnapshot(`
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

        it('returns a reference to the connector.id', () => {
          const jiraConnector = { connector: createJiraConnector() };

          const { references } = extractConnectorIdFromJson({
            action: 'create',
            actionFields: ['connector'],
            stringifiedJson: JSON.stringify(jiraConnector),
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
      });

      describe('update action', () => {
        it('returns undefined when stringifiedJson is not a valid connector', () => {
          expect(
            extractConnectorIdFromJson({
              action: 'update',
              actionFields: ['connector'],
              stringifiedJson: JSON.stringify({ a: 'hello' }),
            })
          ).toBeUndefined();
        });

        it('returns undefined when the action is update and action fields does not contain connector', () => {
          const jiraConnector = createJiraConnector();

          expect(
            extractConnectorIdFromJson({
              action: 'update',
              actionFields: ['', 'something', 'onnector'],
              stringifiedJson: JSON.stringify(jiraConnector),
            })
          ).toBeUndefined();
        });

        it('returns the stringified json without the id', () => {
          const jiraConnector = createJiraConnector();

          const { transformedJson } = extractConnectorIdFromJson({
            action: 'update',
            actionFields: ['connector'],
            stringifiedJson: JSON.stringify(jiraConnector),
          })!;

          expect(JSON.parse(transformedJson)).toMatchInlineSnapshot(`
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

        it('returns a reference to the connector.id', () => {
          const jiraConnector = createJiraConnector();

          const { references } = extractConnectorIdFromJson({
            action: 'update',
            actionFields: ['connector'],
            stringifiedJson: JSON.stringify(jiraConnector),
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
      });

      describe('push action', () => {
        it('returns undefined when stringifiedJson is not a valid external_service', () => {
          expect(
            extractConnectorIdFromJson({
              action: 'push-to-service',
              actionFields: ['pushed'],
              stringifiedJson: JSON.stringify({ a: 'hello' }),
            })
          ).toBeUndefined();
        });

        it('returns undefined when the action is push-to-service and action fields does not contain pushed', () => {
          const externalService = createExternalService();

          expect(
            extractConnectorIdFromJson({
              action: 'push-to-service',
              actionFields: ['', 'something', 'ushed'],
              stringifiedJson: JSON.stringify(externalService),
            })
          ).toBeUndefined();
        });

        it('returns the stringified json without the connector_id', () => {
          const externalService = createExternalService();

          const { transformedJson } = extractConnectorIdFromJson({
            action: 'push-to-service',
            actionFields: ['pushed'],
            stringifiedJson: JSON.stringify(externalService),
          })!;

          expect(JSON.parse(transformedJson)).toMatchInlineSnapshot(`
            Object {
              "external_service": Object {
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
      });
    });
  });
});
