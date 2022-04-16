/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectReference, SavedObjectUnsanitizedDoc } from '@kbn/core/server';
// eslint-disable-next-line no-restricted-imports
import { legacyMigrateRuleAlertId, legacyMigrateAlertId } from './legacy_migrations';
// eslint-disable-next-line no-restricted-imports
import { LegacyIRuleActionsAttributesSavedObjectAttributes } from './legacy_types';

describe('legacy_migrations', () => {
  describe('legacyMigrateRuleAlertId', () => {
    type PartialForTests = Partial<
      SavedObjectUnsanitizedDoc<Partial<LegacyIRuleActionsAttributesSavedObjectAttributes>>
    >;

    test('it migrates both a "ruleAlertId" and a actions array with 1 element into the references array', () => {
      const doc = {
        attributes: {
          ruleThrottle: '1d',
          alertThrottle: '1d',
          ruleAlertId: '123',
          actions: [
            {
              id: '456',
              group: 'group',
              params: {},
              action_type_id: '789',
            },
          ],
        },
      };
      expect(
        legacyMigrateRuleAlertId(
          doc as unknown as SavedObjectUnsanitizedDoc<LegacyIRuleActionsAttributesSavedObjectAttributes>
        )
      ).toEqual({
        attributes: {
          ruleThrottle: '1d',
          alertThrottle: '1d',
          actions: [
            {
              actionRef: 'action_0',
              group: 'group',
              params: {},
              action_type_id: '789',
            },
          ],
        },
        references: [
          {
            id: '123',
            name: 'alert_0',
            type: 'alert',
          },
          {
            id: '456',
            name: 'action_0',
            type: 'action',
          },
        ],
      });
    });

    test('it migrates both a "ruleAlertId" and a actions array with 2 elements into the references array', () => {
      const doc = {
        attributes: {
          ruleAlertId: '123',
          actions: [
            {
              id: '456',
              group: 'group',
              params: {},
              action_type_id: '789',
            },
            {
              id: '780',
              group: 'group',
              params: {},
              action_type_id: '9999',
            },
          ],
        },
      };
      expect(
        legacyMigrateRuleAlertId(
          doc as unknown as SavedObjectUnsanitizedDoc<LegacyIRuleActionsAttributesSavedObjectAttributes>
        )
      ).toEqual({
        attributes: {
          actions: [
            {
              actionRef: 'action_0',
              group: 'group',
              params: {},
              action_type_id: '789',
            },
            {
              actionRef: 'action_1',
              group: 'group',
              params: {},
              action_type_id: '9999',
            },
          ],
        },
        references: [
          {
            id: '123',
            name: 'alert_0',
            type: 'alert',
          },
          {
            id: '456',
            name: 'action_0',
            type: 'action',
          },
          {
            id: '780',
            name: 'action_1',
            type: 'action',
          },
        ],
      });
    });

    test('it returns existing references when migrating both a "ruleAlertId" and a actions array into the references array', () => {
      const doc = {
        attributes: {
          ruleAlertId: '123',
          actions: [
            {
              id: '456',
              group: 'group',
              params: {},
              action_type_id: '789',
            },
          ],
        },
        references: [
          {
            id: '890',
            name: 'foreign_0',
            type: 'foreign',
          },
        ],
      };
      expect(
        legacyMigrateRuleAlertId(
          doc as unknown as SavedObjectUnsanitizedDoc<LegacyIRuleActionsAttributesSavedObjectAttributes>
        )
      ).toEqual({
        attributes: {
          actions: [
            {
              actionRef: 'action_0',
              group: 'group',
              params: {},
              action_type_id: '789',
            },
          ],
        },
        references: [
          {
            id: '890',
            name: 'foreign_0',
            type: 'foreign',
          },
          {
            id: '123',
            name: 'alert_0',
            type: 'alert',
          },
          {
            id: '456',
            name: 'action_0',
            type: 'action',
          },
        ],
      });
    });

    test('it is idempotent and does not migrate twice if "ruleAlertId" and the actions array are already migrated', () => {
      const doc = {
        attributes: {
          ruleAlertId: '123',
          actions: [
            {
              id: '456',
              group: 'group',
              params: {},
              action_type_id: '789',
            },
          ],
        },
        references: [
          {
            id: '123',
            name: 'alert_0',
            type: 'alert',
          },
          {
            id: '456',
            name: 'action_0',
            type: 'action',
          },
        ],
      };
      expect(
        legacyMigrateRuleAlertId(
          doc as unknown as SavedObjectUnsanitizedDoc<LegacyIRuleActionsAttributesSavedObjectAttributes>
        )
      ).toEqual({
        attributes: {
          actions: [
            {
              actionRef: 'action_0',
              group: 'group',
              params: {},
              action_type_id: '789',
            },
          ],
        },
        references: [
          {
            id: '123',
            name: 'alert_0',
            type: 'alert',
          },
          {
            id: '456',
            name: 'action_0',
            type: 'action',
          },
        ],
      });
    });

    test('does not migrate if "ruleAlertId" is not a string', () => {
      const doc: PartialForTests = {
        attributes: {
          ruleAlertId: 123, // invalid as this is a number
          actions: [
            {
              id: '456',
              group: 'group',
              params: {},
              action_type_id: '789',
            },
          ],
        },
      } as unknown as PartialForTests;
      expect(
        legacyMigrateRuleAlertId(
          doc as SavedObjectUnsanitizedDoc<LegacyIRuleActionsAttributesSavedObjectAttributes>
        )
      ).toEqual({
        attributes: {
          ruleAlertId: 123,
          actions: [
            {
              id: '456',
              group: 'group',
              params: {},
              action_type_id: '789',
            },
          ],
        },
        references: [],
      });
    });

    test('does not migrate if "actions" is not an array', () => {
      const doc: PartialForTests = {
        attributes: {
          ruleAlertId: '123',
          actions: 'string', // invalid as this is not an array
        },
      } as unknown as PartialForTests;
      expect(
        legacyMigrateRuleAlertId(
          doc as SavedObjectUnsanitizedDoc<LegacyIRuleActionsAttributesSavedObjectAttributes>
        )
      ).toEqual({
        attributes: {
          ruleAlertId: '123',
          actions: 'string',
        },
        references: [],
      });
    });
  });

  describe('migrateAlertId', () => {
    type FuncReturn = ReturnType<typeof legacyMigrateAlertId>;

    test('it migrates a "ruleAlertId" when the existing references is an empty array', () => {
      expect(
        legacyMigrateAlertId({ ruleAlertId: '123', existingReferences: [] })
      ).toEqual<FuncReturn>([
        {
          id: '123',
          name: 'alert_0',
          type: 'alert',
        },
      ]);
    });

    test('it does not return existing references when it migrates a "ruleAlertId"', () => {
      const existingReferences: SavedObjectReference[] = [
        {
          id: '456',
          name: 'foreign_0',
          type: 'foreign',
        },
      ];
      expect(legacyMigrateAlertId({ ruleAlertId: '123', existingReferences })).toEqual<FuncReturn>([
        {
          id: '123',
          name: 'alert_0',
          type: 'alert',
        },
      ]);
    });

    test('it does not migrate twice if "ruleAlertId" is already migrated by returning an empty array', () => {
      const existingReferences: SavedObjectReference[] = [
        {
          id: '123',
          name: 'alert_0',
          type: 'alert',
        },
      ];
      expect(legacyMigrateAlertId({ ruleAlertId: '123', existingReferences })).toEqual<FuncReturn>(
        []
      );
    });

    test('it does not return existing references when it migrates a "ruleAlertId" and does not migrate twice if "ruleAlertId" is already migrated by returning an empty array', () => {
      const existingReferences: SavedObjectReference[] = [
        {
          id: '456',
          name: 'foreign_0',
          type: 'foreign',
        },
        {
          id: '123',
          name: 'alert_0',
          type: 'alert',
        },
      ];
      expect(legacyMigrateAlertId({ ruleAlertId: '123', existingReferences })).toEqual<FuncReturn>(
        []
      );
    });
  });
});
