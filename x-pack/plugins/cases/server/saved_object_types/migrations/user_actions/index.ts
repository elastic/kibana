/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import {
  SavedObjectUnsanitizedDoc,
  SavedObjectSanitizedDoc,
  SavedObjectMigrationMap,
  mergeSavedObjectMigrationMaps,
  SavedObjectMigrationFn,
} from '@kbn/core/server';

import { MigrateFunctionsObject, MigrateFunction } from '@kbn/kibana-utils-plugin/common';
import { mapValues } from 'lodash';
import { PersistableStateAttachmentState } from '../../../attachment_framework/types';
import {
  ActionTypes,
  CaseUserActionAttributes,
  CommentType,
  ConnectorTypes,
} from '../../../../common/api';
import { PersistableStateAttachmentTypeRegistry } from '../../../attachment_framework/persistable_state_registry';
import { addOwnerToSO, SanitizedCaseOwner } from '..';
import { removeRuleInformation } from './alerts';
import { userActionsConnectorIdMigration } from './connector_id';
import { payloadMigration } from './payload';
import { addSeverityToCreateUserAction } from './severity';
import { UserActions } from './types';
import { getAllPersistableAttachmentMigrations } from '../get_all_persistable_attachment_migrations';

export interface UserActionsMigrationsDeps {
  persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry;
}

export const createUserActionsMigrations = (
  deps: UserActionsMigrationsDeps
): SavedObjectMigrationMap => {
  const persistableStateAttachmentMigrations = mapValues<
    MigrateFunctionsObject,
    SavedObjectMigrationFn<CaseUserActionAttributes>
  >(
    getAllPersistableAttachmentMigrations(deps.persistableStateAttachmentTypeRegistry),
    migratePersistableStateAttachments
  ) as MigrateFunctionsObject;

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
  };

  return mergeSavedObjectMigrationMaps(persistableStateAttachmentMigrations, userActionsMigrations);
};

export const migratePersistableStateAttachments =
  (
    migrate: MigrateFunction
  ): SavedObjectMigrationFn<CaseUserActionAttributes, CaseUserActionAttributes> =>
  (doc: SavedObjectUnsanitizedDoc<CaseUserActionAttributes>) => {
    if (
      doc.attributes.type !== ActionTypes.comment ||
      doc.attributes.payload.comment.type !== CommentType.persistableState
    ) {
      return doc;
    }

    const { persistableStateAttachmentState, persistableStateAttachmentTypeId } =
      doc.attributes.payload.comment;

    const migratedState = migrate({
      persistableStateAttachmentState,
      persistableStateAttachmentTypeId,
    }) as PersistableStateAttachmentState;

    return {
      ...doc,
      attributes: {
        ...doc.attributes,
        payload: {
          ...doc.attributes.payload,
          comment: {
            ...doc.attributes.payload.comment,
            persistableStateAttachmentState: migratedState.persistableStateAttachmentState,
          },
        },
      },
      references: doc.references ?? [],
    };
  };
