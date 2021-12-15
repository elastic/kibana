/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import { addOwnerToSO, SanitizedCaseOwner } from '.';
import {
  SavedObjectUnsanitizedDoc,
  SavedObjectSanitizedDoc,
  SavedObjectMigrationContext,
} from '../../../../../../src/core/server';

import { Actions, ConnectorTypes } from '../../../common/api';
import { UserActions, UserActionUnmigratedConnectorDocument } from './types';

import {
  logError,
  getUserActionType,
  getPayload,
  removeOldReferences,
  isConnectorUserAction,
  formatDocumentWithConnectorReferences,
} from './utils';

export function userActionsConnectorIdMigration(
  doc: SavedObjectUnsanitizedDoc<UserActionUnmigratedConnectorDocument>,
  context: SavedObjectMigrationContext
): SavedObjectSanitizedDoc<unknown> {
  const originalDocWithReferences = { ...doc, references: doc.references ?? [] };

  if (!isConnectorUserAction(doc.attributes.action, doc.attributes.action_field)) {
    return originalDocWithReferences;
  }

  try {
    return formatDocumentWithConnectorReferences(doc);
  } catch (error) {
    logError({
      id: doc.id,
      context,
      error,
      docType: 'user action connector',
      docKey: 'userAction',
    });

    return originalDocWithReferences;
  }
}

export function payloadMigration(
  doc: SavedObjectUnsanitizedDoc<UserActions>,
  context: SavedObjectMigrationContext
): SavedObjectSanitizedDoc<unknown> {
  const originalDocWithReferences = { ...doc, references: doc.references ?? [] };
  const owner = originalDocWithReferences.attributes.owner;

  try {
    const { new_value, old_value, action_field, action_at, action_by, action, ...restAttributes } =
      originalDocWithReferences.attributes;

    const type = getUserActionType(action_field, action);
    const payload = getPayload(type, action_field, new_value, old_value, owner);
    const references = removeOldReferences(doc.references);
    const newAction = action === 'push-to-service' ? Actions.push_to_service : action;

    return {
      ...originalDocWithReferences,
      attributes: {
        ...restAttributes,
        action: newAction,
        created_at: action_at,
        created_by: action_by,
        payload,
        type,
      },
      references,
    };
  } catch (error) {
    logError({
      id: doc.id,
      context,
      error,
      docType: 'user action connector',
      docKey: 'userAction',
    });

    return originalDocWithReferences;
  }
}

export const userActionsMigrations = {
  '7.10.0': (doc: SavedObjectUnsanitizedDoc<UserActions>): SavedObjectSanitizedDoc<UserActions> => {
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
  '8.1.0': payloadMigration,
};
