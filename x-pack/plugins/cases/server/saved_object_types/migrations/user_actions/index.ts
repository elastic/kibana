/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import type {
  SavedObjectUnsanitizedDoc,
  SavedObjectSanitizedDoc,
  SavedObjectMigrationMap,
} from '@kbn/core/server';

import { ConnectorTypes } from '../../../../common/types/domain';
import type { PersistableStateAttachmentTypeRegistry } from '../../../attachment_framework/persistable_state_registry';
import type { SanitizedCaseOwner } from '..';
import { addOwnerToSO } from '..';
import { removeRuleInformation } from './alerts';
import { userActionsConnectorIdMigration } from './connector_id';
import { payloadMigration } from './payload';
import { addSeverityToCreateUserAction } from './severity';
import type { UserActions } from './types';
import { addAssigneesToCreateUserAction } from './assignees';

export interface UserActionsMigrationsDeps {
  persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry;
}

export const createUserActionsMigrations = (
  deps: UserActionsMigrationsDeps
): SavedObjectMigrationMap => {
  const userActionsMigrations = {
    '7.10.0': (
      doc: SavedObjectUnsanitizedDoc<UserActions>
    ): SavedObjectSanitizedDoc<UserActions> => {
      const { action_field, new_value, old_value, ...restAttributes } = doc.attributes;

      if (
        action_field == null ||
        !Array.isArray(action_field) ||
        action_field[0] !== 'connector_id'
      ) {
        return { ...doc, references: doc.references || [] };
      }

      return {
        ...doc,
        attributes: {
          ...restAttributes,
          action_field: ['connector'],
          new_value:
            new_value != null
              ? JSON.stringify({
                  id: new_value,
                  name: 'none',
                  type: ConnectorTypes.none,
                  fields: null,
                })
              : new_value,
          old_value:
            old_value != null
              ? JSON.stringify({
                  id: old_value,
                  name: 'none',
                  type: ConnectorTypes.none,
                  fields: null,
                })
              : old_value,
        },
        references: doc.references || [],
      };
    },
    '7.14.0': (
      doc: SavedObjectUnsanitizedDoc<Record<string, unknown>>
    ): SavedObjectSanitizedDoc<SanitizedCaseOwner> => {
      return addOwnerToSO(doc);
    },
    '7.16.0': userActionsConnectorIdMigration,
    '8.0.0': removeRuleInformation,
    '8.1.0': payloadMigration,
    '8.3.0': addSeverityToCreateUserAction,
    '8.5.0': addAssigneesToCreateUserAction,
  };

  return userActionsMigrations;
};
