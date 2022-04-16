/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import { SavedObjectMigrationContext, SavedObjectUnsanitizedDoc } from '@kbn/core/server';
import { migrationMocks } from '@kbn/core/server/mocks';
import { CommentType } from '../../../../common/api';
import {
  CASE_USER_ACTION_SAVED_OBJECT,
  SECURITY_SOLUTION_OWNER,
} from '../../../../common/constants';
import { createJiraConnector } from '../../../services/test_utils';
import { payloadMigration } from './payload';
import { UserActions } from './types';

const create_7_14_0_userAction = (params: {
  action: string;
  action_field: string[];
  new_value: string | null | object;
  old_value: string | null | object;
}): SavedObjectUnsanitizedDoc<UserActions> => {
  const { new_value, old_value, ...restParams } = params;

  return {
    type: CASE_USER_ACTION_SAVED_OBJECT,
    id: '1',
    attributes: {
      ...restParams,
      action_at: '2022-01-09T22:00:00.000Z',
      action_by: {
        email: 'elastic@elastic.co',
        full_name: 'Elastic User',
        username: 'elastic',
      },
      new_value:
        new_value && typeof new_value === 'object' ? JSON.stringify(new_value) : new_value ?? null,
      old_value:
        old_value && typeof old_value === 'object' ? JSON.stringify(old_value) : old_value ?? null,
      owner: SECURITY_SOLUTION_OWNER,
    },
  };
};

describe('user action migrations', () => {
  describe('8.1.0', () => {
    let context: jest.Mocked<SavedObjectMigrationContext>;

    beforeEach(() => {
      context = migrationMocks.createContext();
    });

    describe('references', () => {
      it('removes the old references', () => {
        const userAction = create_7_14_0_userAction({
          action: 'update',
          action_field: ['connector'],
          new_value: createJiraConnector(),
          old_value: { ...createJiraConnector(), id: '5' },
        });

        const migratedUserAction = payloadMigration(
          {
            ...userAction,
            references: [
              { id: '1', name: 'connectorId', type: 'action' },
              { id: '5', name: 'oldConnectorId', type: 'action' },
              { id: '100', name: 'pushConnectorId', type: 'action' },
              { id: '5', name: 'oldPushConnectorId', type: 'action' },
            ],
          },
          context
        );
        expect(migratedUserAction.references).toEqual([
          { id: '1', name: 'connectorId', type: 'action' },
          { id: '100', name: 'pushConnectorId', type: 'action' },
        ]);
      });
    });

    describe('payloadMigration', () => {
      const expectedCreateCaseUserAction = {
        action: 'create',
        created_at: '2022-01-09T22:00:00.000Z',
        created_by: {
          email: 'elastic@elastic.co',
          full_name: 'Elastic User',
          username: 'elastic',
        },
        owner: 'securitySolution',
        payload: {
          connector: {
            fields: null,
            name: 'none',
            type: '.none',
          },
          description: 'a desc',
          tags: ['some tags'],
          title: 'old case',
          status: 'open',
          owner: 'securitySolution',
          settings: { syncAlerts: true },
        },
        type: 'create_case',
      };

      it('it transforms a comment user action where the new_value is a string', () => {
        const userAction = create_7_14_0_userAction({
          action: 'create',
          action_field: ['comment'],
          new_value: 'A comment',
          old_value: null,
        });

        const migratedUserAction = payloadMigration(userAction, context);
        expect(migratedUserAction.attributes).toEqual({
          action: 'create',
          created_at: '2022-01-09T22:00:00.000Z',
          created_by: {
            email: 'elastic@elastic.co',
            full_name: 'Elastic User',
            username: 'elastic',
          },
          owner: 'securitySolution',
          payload: {
            comment: {
              comment: 'A comment',
              owner: 'securitySolution',
              type: 'user',
            },
          },
          type: 'comment',
        });
      });

      it('adds the owner to the comment if it is missing', () => {
        const userAction = create_7_14_0_userAction({
          action: 'create',
          action_field: ['comment'],
          new_value: { comment: 'A comment', type: CommentType.user },
          old_value: null,
        });

        const migratedUserAction = payloadMigration(userAction, context);
        expect(migratedUserAction.attributes).toEqual({
          action: 'create',
          created_at: '2022-01-09T22:00:00.000Z',
          created_by: {
            email: 'elastic@elastic.co',
            full_name: 'Elastic User',
            username: 'elastic',
          },
          owner: 'securitySolution',
          payload: {
            comment: {
              comment: 'A comment',
              owner: 'securitySolution',
              type: 'user',
            },
          },
          type: 'comment',
        });
      });

      it('transforms a create case user action without a connector or status', () => {
        const userAction = create_7_14_0_userAction({
          action: 'create',
          action_field: ['description', 'title', 'tags', 'owner', 'settings'],
          new_value: {
            title: 'old case',
            description: 'a desc',
            tags: ['some tags'],
            owner: SECURITY_SOLUTION_OWNER,
            settings: { syncAlerts: true },
          },
          old_value: null,
        });

        const migratedUserAction = payloadMigration(userAction, context);
        expect(migratedUserAction.attributes).toEqual(expectedCreateCaseUserAction);
      });

      it('adds the owner in the payload on a create case user action if it is missing', () => {
        const userAction = create_7_14_0_userAction({
          action: 'create',
          action_field: ['description', 'title', 'tags', 'settings'],
          new_value: {
            title: 'old case',
            description: 'a desc',
            tags: ['some tags'],
            settings: { syncAlerts: true },
          },
          old_value: null,
        });

        const migratedUserAction = payloadMigration(userAction, context);
        expect(migratedUserAction.attributes).toEqual(expectedCreateCaseUserAction);
      });

      it('adds the settings in the payload on a create case user action if it is missing', () => {
        const userAction = create_7_14_0_userAction({
          action: 'create',
          action_field: ['description', 'title', 'tags'],
          new_value: {
            title: 'old case',
            description: 'a desc',
            tags: ['some tags'],
          },
          old_value: null,
        });

        const migratedUserAction = payloadMigration(userAction, context);
        expect(migratedUserAction.attributes).toEqual(expectedCreateCaseUserAction);
      });

      describe('user actions', () => {
        const fieldsTests: Array<[string, string | object]> = [
          ['description', 'a desc'],
          ['title', 'a title'],
          ['status', 'open'],
          ['comment', { comment: 'a comment', type: 'user', owner: 'securitySolution' }],
          [
            'connector',
            {
              fields: {
                issueType: 'bug',
                parent: '2',
                priority: 'high',
              },
              name: '.jira',
              type: '.jira',
            },
          ],
          ['settings', { syncAlerts: false }],
        ];

        it('migrates a create case user action correctly', () => {
          const userAction = create_7_14_0_userAction({
            action: 'create',
            action_field: [
              'description',
              'title',
              'tags',
              'status',
              'settings',
              'owner',
              'connector',
            ],
            new_value: {
              title: 'old case',
              description: 'a desc',
              tags: ['some tags'],
              status: 'in-progress',
              settings: { syncAlerts: false },
              connector: {
                fields: {
                  issueType: 'bug',
                  parent: '2',
                  priority: 'high',
                },
                name: '.jira',
                type: '.jira',
              },
              owner: 'testOwner',
            },
            old_value: null,
          });

          const migratedUserAction = payloadMigration(userAction, context);
          expect(migratedUserAction.attributes).toEqual({
            action: 'create',
            created_at: '2022-01-09T22:00:00.000Z',
            created_by: {
              email: 'elastic@elastic.co',
              full_name: 'Elastic User',
              username: 'elastic',
            },
            owner: 'securitySolution',
            payload: {
              connector: {
                fields: {
                  issueType: 'bug',
                  parent: '2',
                  priority: 'high',
                },
                name: '.jira',
                type: '.jira',
              },
              description: 'a desc',
              tags: ['some tags'],
              title: 'old case',
              settings: {
                syncAlerts: false,
              },
              status: 'in-progress',
              owner: 'testOwner',
            },
            type: 'create_case',
          });
        });

        it.each(fieldsTests)('migrates a user action for %s correctly', (field, value) => {
          const userAction = create_7_14_0_userAction({
            action: 'update',
            action_field: [field],
            new_value: value,
            old_value: null,
          });

          const migratedUserAction = payloadMigration(userAction, context);
          expect(migratedUserAction.attributes).toEqual({
            action: 'update',
            created_at: '2022-01-09T22:00:00.000Z',
            created_by: {
              email: 'elastic@elastic.co',
              full_name: 'Elastic User',
              username: 'elastic',
            },
            owner: 'securitySolution',
            payload: {
              [field]: value,
            },
            type: field,
          });
        });

        it('migrates a user action for tags correctly', () => {
          const userAction = create_7_14_0_userAction({
            action: 'update',
            action_field: ['tags'],
            new_value: 'one, two',
            old_value: null,
          });

          const migratedUserAction = payloadMigration(userAction, context);
          expect(migratedUserAction.attributes).toEqual({
            action: 'update',
            created_at: '2022-01-09T22:00:00.000Z',
            created_by: {
              email: 'elastic@elastic.co',
              full_name: 'Elastic User',
              username: 'elastic',
            },
            owner: 'securitySolution',
            payload: {
              tags: ['one', 'two'],
            },
            type: 'tags',
          });
        });

        it('migrates a user action for external services correctly', () => {
          const userAction = create_7_14_0_userAction({
            action: 'update',
            action_field: ['pushed'],
            new_value: {
              connector_name: 'jira',
              external_title: 'awesome',
              external_url: 'http://www.google.com',
              pushed_at: '2019-11-25T21:54:48.952Z',
              pushed_by: {
                full_name: 'elastic',
                email: 'testemail@elastic.co',
                username: 'elastic',
              },
            },
            old_value: null,
          });

          const migratedUserAction = payloadMigration(userAction, context);
          expect(migratedUserAction.attributes).toEqual({
            action: 'update',
            created_at: '2022-01-09T22:00:00.000Z',
            created_by: {
              email: 'elastic@elastic.co',
              full_name: 'Elastic User',
              username: 'elastic',
            },
            owner: 'securitySolution',
            payload: {
              externalService: {
                connector_name: 'jira',
                external_title: 'awesome',
                external_url: 'http://www.google.com',
                pushed_at: '2019-11-25T21:54:48.952Z',
                pushed_by: {
                  full_name: 'elastic',
                  email: 'testemail@elastic.co',
                  username: 'elastic',
                },
              },
            },
            type: 'pushed',
          });
        });
      });
    });

    describe('failures', () => {});
  });
});
