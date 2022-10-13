/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import {
  getActionTaskParamsMigrations,
  isPreconfiguredAction,
} from './action_task_params_migrations';
import { ActionTaskParams } from '../types';
import { SavedObjectReference, SavedObjectUnsanitizedDoc } from '@kbn/core/server';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { migrationMocks } from '@kbn/core/server/mocks';

const context = migrationMocks.createContext();
const encryptedSavedObjectsSetup = encryptedSavedObjectsMock.createSetup();

const preconfiguredActions = [
  {
    actionTypeId: 'foo',
    config: {},
    id: 'my-slack1',
    name: 'Slack #xyz',
    secrets: {},
    isPreconfigured: true,
    isDeprecated: false,
  },
];

describe('successful migrations', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    encryptedSavedObjectsSetup.createMigration.mockImplementation(({ migration }) => migration);
  });

  describe('7.16.0', () => {
    test('adds actionId to references array if actionId is not preconfigured', () => {
      const migration716 = getActionTaskParamsMigrations(
        encryptedSavedObjectsSetup,
        preconfiguredActions
      )['7.16.0'];
      const actionTaskParam = getMockData();
      const migratedActionTaskParam = migration716(actionTaskParam, context);
      expect(migratedActionTaskParam).toEqual({
        ...actionTaskParam,
        references: [
          {
            id: actionTaskParam.attributes.actionId,
            name: 'actionRef',
            type: 'action',
          },
        ],
      });
    });

    test('does not add actionId to references array if actionId is preconfigured', () => {
      const migration716 = getActionTaskParamsMigrations(
        encryptedSavedObjectsSetup,
        preconfiguredActions
      )['7.16.0'];
      const actionTaskParam = getMockData({ actionId: 'my-slack1' });
      const migratedActionTaskParam = migration716(actionTaskParam, context);
      expect(migratedActionTaskParam).toEqual({
        ...actionTaskParam,
        references: [],
      });
    });

    test('handles empty relatedSavedObjects array', () => {
      const migration716 = getActionTaskParamsMigrations(
        encryptedSavedObjectsSetup,
        preconfiguredActions
      )['7.16.0'];
      const actionTaskParam = getMockData({ relatedSavedObjects: [] });
      const migratedActionTaskParam = migration716(actionTaskParam, context);
      expect(migratedActionTaskParam).toEqual({
        ...actionTaskParam,
        attributes: {
          ...actionTaskParam.attributes,
          relatedSavedObjects: [],
        },
        references: [
          {
            id: actionTaskParam.attributes.actionId,
            name: 'actionRef',
            type: 'action',
          },
        ],
      });
    });

    test('adds actionId and relatedSavedObjects to references array', () => {
      const migration716 = getActionTaskParamsMigrations(
        encryptedSavedObjectsSetup,
        preconfiguredActions
      )['7.16.0'];
      const actionTaskParam = getMockData({
        relatedSavedObjects: [
          {
            id: 'some-id',
            namespace: 'some-namespace',
            type: 'some-type',
            typeId: 'some-typeId',
          },
        ],
      });
      const migratedActionTaskParam = migration716(actionTaskParam, context);
      expect(migratedActionTaskParam).toEqual({
        ...actionTaskParam,
        attributes: {
          ...actionTaskParam.attributes,
          relatedSavedObjects: [
            {
              id: 'related_some-type_0',
              namespace: 'some-namespace',
              type: 'some-type',
              typeId: 'some-typeId',
            },
          ],
        },
        references: [
          {
            id: actionTaskParam.attributes.actionId,
            name: 'actionRef',
            type: 'action',
          },
          {
            id: 'some-id',
            name: 'related_some-type_0',
            type: 'some-type',
          },
        ],
      });
    });

    test('only adds relatedSavedObjects to references array if action is preconfigured', () => {
      const migration716 = getActionTaskParamsMigrations(
        encryptedSavedObjectsSetup,
        preconfiguredActions
      )['7.16.0'];
      const actionTaskParam = getMockData({
        actionId: 'my-slack1',
        relatedSavedObjects: [
          {
            id: 'some-id',
            namespace: 'some-namespace',
            type: 'some-type',
            typeId: 'some-typeId',
          },
        ],
      });
      const migratedActionTaskParam = migration716(actionTaskParam, context);
      expect(migratedActionTaskParam).toEqual({
        ...actionTaskParam,
        attributes: {
          ...actionTaskParam.attributes,
          relatedSavedObjects: [
            {
              id: 'related_some-type_0',
              namespace: 'some-namespace',
              type: 'some-type',
              typeId: 'some-typeId',
            },
          ],
        },
        references: [
          {
            id: 'some-id',
            name: 'related_some-type_0',
            type: 'some-type',
          },
        ],
      });
    });

    test('adds actionId and multiple relatedSavedObjects to references array', () => {
      const migration716 = getActionTaskParamsMigrations(
        encryptedSavedObjectsSetup,
        preconfiguredActions
      )['7.16.0'];
      const actionTaskParam = getMockData({
        relatedSavedObjects: [
          {
            id: 'some-id',
            namespace: 'some-namespace',
            type: 'some-type',
            typeId: 'some-typeId',
          },
          {
            id: 'another-id',
            type: 'another-type',
            typeId: 'another-typeId',
          },
        ],
      });
      const migratedActionTaskParam = migration716(actionTaskParam, context);
      expect(migratedActionTaskParam).toEqual({
        ...actionTaskParam,
        attributes: {
          ...actionTaskParam.attributes,
          relatedSavedObjects: [
            {
              id: 'related_some-type_0',
              namespace: 'some-namespace',
              type: 'some-type',
              typeId: 'some-typeId',
            },
            {
              id: 'related_another-type_1',
              type: 'another-type',
              typeId: 'another-typeId',
            },
          ],
        },
        references: [
          {
            id: actionTaskParam.attributes.actionId,
            name: 'actionRef',
            type: 'action',
          },
          {
            id: 'some-id',
            name: 'related_some-type_0',
            type: 'some-type',
          },
          {
            id: 'another-id',
            name: 'related_another-type_1',
            type: 'another-type',
          },
        ],
      });
    });

    test('does not overwrite existing references', () => {
      const migration716 = getActionTaskParamsMigrations(
        encryptedSavedObjectsSetup,
        preconfiguredActions
      )['7.16.0'];
      const actionTaskParam = getMockData(
        {
          relatedSavedObjects: [
            {
              id: 'some-id',
              namespace: 'some-namespace',
              type: 'some-type',
              typeId: 'some-typeId',
            },
          ],
        },
        [
          {
            id: 'existing-ref-id',
            name: 'existingRef',
            type: 'existing-ref-type',
          },
        ]
      );
      const migratedActionTaskParam = migration716(actionTaskParam, context);
      expect(migratedActionTaskParam).toEqual({
        ...actionTaskParam,
        attributes: {
          ...actionTaskParam.attributes,
          relatedSavedObjects: [
            {
              id: 'related_some-type_0',
              namespace: 'some-namespace',
              type: 'some-type',
              typeId: 'some-typeId',
            },
          ],
        },
        references: [
          {
            id: 'existing-ref-id',
            name: 'existingRef',
            type: 'existing-ref-type',
          },
          {
            id: actionTaskParam.attributes.actionId,
            name: 'actionRef',
            type: 'action',
          },
          {
            id: 'some-id',
            name: 'related_some-type_0',
            type: 'some-type',
          },
        ],
      });
    });

    test('does not overwrite existing references if relatedSavedObjects is undefined', () => {
      const migration716 = getActionTaskParamsMigrations(
        encryptedSavedObjectsSetup,
        preconfiguredActions
      )['7.16.0'];
      const actionTaskParam = getMockData({}, [
        {
          id: 'existing-ref-id',
          name: 'existingRef',
          type: 'existing-ref-type',
        },
      ]);
      const migratedActionTaskParam = migration716(actionTaskParam, context);
      expect(migratedActionTaskParam).toEqual({
        ...actionTaskParam,
        references: [
          {
            id: 'existing-ref-id',
            name: 'existingRef',
            type: 'existing-ref-type',
          },
          {
            id: actionTaskParam.attributes.actionId,
            name: 'actionRef',
            type: 'action',
          },
        ],
      });
    });

    test('does not overwrite existing references if relatedSavedObjects is empty', () => {
      const migration716 = getActionTaskParamsMigrations(
        encryptedSavedObjectsSetup,
        preconfiguredActions
      )['7.16.0'];
      const actionTaskParam = getMockData({ relatedSavedObjects: [] }, [
        {
          id: 'existing-ref-id',
          name: 'existingRef',
          type: 'existing-ref-type',
        },
      ]);
      const migratedActionTaskParam = migration716(actionTaskParam, context);
      expect(migratedActionTaskParam).toEqual({
        ...actionTaskParam,
        attributes: {
          ...actionTaskParam.attributes,
          relatedSavedObjects: [],
        },
        references: [
          {
            id: 'existing-ref-id',
            name: 'existingRef',
            type: 'existing-ref-type',
          },
          {
            id: actionTaskParam.attributes.actionId,
            name: 'actionRef',
            type: 'action',
          },
        ],
      });
    });
  });

  describe('8.0.0', () => {
    test('no op migration for rules SO', () => {
      const migration800 = getActionTaskParamsMigrations(encryptedSavedObjectsSetup, [])['8.0.0'];
      const actionTaskParam = getMockData();
      expect(migration800(actionTaskParam, context)).toEqual(actionTaskParam);
    });
  });
});

describe('handles errors during migrations', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    encryptedSavedObjectsSetup.createMigration.mockImplementation(() => () => {
      throw new Error(`Can't migrate!`);
    });
  });

  describe('7.16.0 throws if migration fails', () => {
    test('should show the proper exception', () => {
      const migration716 = getActionTaskParamsMigrations(
        encryptedSavedObjectsSetup,
        preconfiguredActions
      )['7.16.0'];
      const actionTaskParam = getMockData();
      expect(() => {
        migration716(actionTaskParam, context);
      }).toThrowError(`Can't migrate!`);
      expect(context.log.error).toHaveBeenCalledWith(
        `encryptedSavedObject 7.16.0 migration failed for action task param ${actionTaskParam.id} with error: Can't migrate!`,
        {
          migrations: {
            actionTaskParamDocument: actionTaskParam,
          },
        }
      );
    });
  });
});

describe('isPreconfiguredAction()', () => {
  test('returns true if actionId is preconfigured action', () => {
    expect(
      isPreconfiguredAction(getMockData({ actionId: 'my-slack1' }), preconfiguredActions)
    ).toEqual(true);
  });

  test('returns false if actionId is not preconfigured action', () => {
    expect(isPreconfiguredAction(getMockData(), preconfiguredActions)).toEqual(false);
  });
});

function getMockData(
  overwrites: Record<string, unknown> = {},
  referencesOverwrites: SavedObjectReference[] = []
): SavedObjectUnsanitizedDoc<ActionTaskParams> {
  return {
    attributes: {
      actionId: uuid.v4(),
      params: {},
      ...overwrites,
    },
    references: [...referencesOverwrites],
    id: uuid.v4(),
    type: 'action_task_param',
  };
}
