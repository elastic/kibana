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
  SavedObjectMigrationContext,
} from '@kbn/core/server';
import { mergeSavedObjectMigrationMaps } from '@kbn/core/server';

import type { LensServerPluginSetup } from '@kbn/lens-plugin/server';
import type { MigrateFunction } from '@kbn/kibana-utils-plugin/common';
import type { SavedObjectMigrationParams } from '@kbn/core-saved-objects-server';
import { omitBy } from 'lodash';
import lt from 'semver/functions/lt';
import valid from 'semver/functions/valid';
import type { UserActionPersistedAttributes } from '../../../common/types/user_actions';
import { ConnectorTypes } from '../../../../common/api';
import type { PersistableStateAttachmentTypeRegistry } from '../../../attachment_framework/persistable_state_registry';
import type { SanitizedCaseOwner } from '..';
import { addOwnerToSO } from '..';
import { removeRuleInformation } from './alerts';
import { userActionsConnectorIdMigration } from './connector_id';
import { payloadMigration } from './payload';
import { addSeverityToCreateUserAction } from './severity';
import type { UserActions } from './types';
import { addAssigneesToCreateUserAction } from './assignees';
import {
  getLensMigrations,
  isDeferredMigration,
  isPersistableStateLensAttachmentUserActionSO,
  logError,
} from '../utils';
import { MIN_USER_ACTIONS_DEFERRED_KIBANA_VERSION } from '../constants';

export interface UserActionsMigrationsDeps {
  persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry;
  lensEmbeddableFactory: LensServerPluginSetup['lensEmbeddableFactory'];
}

export const createUserActionsMigrations = (
  deps: UserActionsMigrationsDeps
): SavedObjectMigrationMap => {
  const embeddableMigrations = getLensMigrations({
    lensEmbeddableFactory: deps.lensEmbeddableFactory,
    migratorFactory: lensMigratorFactory,
  });

  /**
   * In 8.9 we introduced the lens persistable attachment type.
   * For that reason we want to migrate only the 8.10+ lens migrations.
   * The code below, removes all <= 8.9 migrations and keeps the rest.
   */
  const embeddableMigrationsToMerge = omitBy(embeddableMigrations, (_, version: string) => {
    if (!valid(version)) {
      return true;
    }

    return lt(version, MIN_USER_ACTIONS_DEFERRED_KIBANA_VERSION);
  });

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

  return mergeSavedObjectMigrationMaps(userActionsMigrations, embeddableMigrationsToMerge);
};

export const lensMigratorFactory = (
  migrate: MigrateFunction,
  migrationVersion: string
): SavedObjectMigrationParams<UserActionPersistedAttributes, UserActionPersistedAttributes> => {
  const deferred = isDeferredMigration(MIN_USER_ACTIONS_DEFERRED_KIBANA_VERSION, migrationVersion);

  return {
    // @ts-expect-error: remove when core changes the types
    deferred,
    transform: (
      doc: SavedObjectUnsanitizedDoc<UserActionPersistedAttributes>,
      context: SavedObjectMigrationContext
    ): SavedObjectSanitizedDoc<UserActionPersistedAttributes> => {
      try {
        if (!isPersistableStateLensAttachmentUserActionSO(doc)) {
          return Object.assign(doc, { references: doc.references ?? [] });
        }

        const { persistableStateAttachmentState } = doc.attributes.payload.comment;

        const migratedLensState = migrate(persistableStateAttachmentState);

        return {
          ...doc,
          attributes: {
            ...doc.attributes,
            payload: {
              ...doc.attributes.payload,
              comment: {
                ...doc.attributes.payload.comment,
                persistableStateAttachmentState: migratedLensState,
              },
            },
          },
          references: doc.references ?? [],
        };
      } catch (error) {
        logError({
          id: doc.id,
          context,
          error,
          docType: 'user action persistable lens attachment',
          docKey: 'comment',
        });
        return Object.assign(doc, { references: doc.references ?? [] });
      }
    },
  };
};
