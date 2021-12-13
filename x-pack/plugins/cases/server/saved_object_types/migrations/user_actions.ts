/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import { isString } from 'lodash';
import { addOwnerToSO, SanitizedCaseOwner } from '.';
import {
  SavedObjectUnsanitizedDoc,
  SavedObjectSanitizedDoc,
  SavedObjectMigrationContext,
  LogMeta,
  SavedObjectReference,
} from '../../../../../../src/core/server';

import { ConnectorTypes } from '../../../common/api';

import {
  isPush,
  isUpdateConnector,
  isCreateConnector,
  UserActionFieldType,
  extractConnectorIdFromJson,
} from './utils';

import {
  USER_ACTION_OLD_ID_REF_NAME,
  USER_ACTION_OLD_PUSH_ID_REF_NAME,
} from '../../common/constants';

interface UserActions {
  action: string;
  action_field: string[];
  action_at: string;
  action_by: { email: string; username: string; full_name: string };
  new_value: string;
  old_value: string;
}

interface UserActionUnmigratedConnectorDocument {
  action?: string;
  action_field?: string[];
  new_value?: string | null;
  old_value?: string | null;
}

interface UserActionLogMeta extends LogMeta {
  migrations: { userAction: { id: string } };
}

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
    logError(doc.id, context, error);

    return originalDocWithReferences;
  }
}

function isConnectorUserAction(action?: string, actionFields?: string[]): boolean {
  return (
    isCreateConnector(action, actionFields) ||
    isUpdateConnector(action, actionFields) ||
    isPush(action, actionFields)
  );
}

function formatDocumentWithConnectorReferences(
  doc: SavedObjectUnsanitizedDoc<UserActionUnmigratedConnectorDocument>
): SavedObjectSanitizedDoc<unknown> {
  const { new_value, old_value, action, action_field, ...restAttributes } = doc.attributes;
  const { references = [] } = doc;

  const { transformedActionDetails: transformedNewValue, references: newValueConnectorRefs } =
    extractConnectorIdFromJson({
      action,
      actionFields: action_field,
      actionDetails: new_value,
      fieldType: UserActionFieldType.New,
    });

  const { transformedActionDetails: transformedOldValue, references: oldValueConnectorRefs } =
    extractConnectorIdFromJson({
      action,
      actionFields: action_field,
      actionDetails: old_value,
      fieldType: UserActionFieldType.Old,
    });

  return {
    ...doc,
    attributes: {
      ...restAttributes,
      action,
      action_field,
      new_value: transformedNewValue,
      old_value: transformedOldValue,
    },
    references: [...references, ...newValueConnectorRefs, ...oldValueConnectorRefs],
  };
}

function logError(id: string, context: SavedObjectMigrationContext, error: Error) {
  context.log.error<UserActionLogMeta>(
    `Failed to migrate user action connector doc id: ${id} version: ${context.migrationVersion} error: ${error.message}`,
    {
      migrations: {
        userAction: {
          id,
        },
      },
    }
  );
}

const getSingleFieldPayload = (field: string, value: string | undefined) => {
  const decodeValue = (v: string | undefined) => (isString(v) ? JSON.parse(v) : value ?? {});

  switch (field) {
    case 'title':
      return { title: value ?? '' };
    case 'tags':
      return { tags: isString(value) ? value.split(',') : value ?? [] };
    case 'status':
      return { status: value ?? '' };
    case 'description':
      return { description: value ?? '' };
    case 'comment':
      return { comment: decodeValue(value) };
    case 'connector':
      return { connector: decodeValue(value) };
    case 'pushed':
      return { externalService: decodeValue(value) };
    case 'settings':
      return { settings: decodeValue(value) };

    default:
      return {};
  }
};

const fieldToActionType: Record<string, string> = {
  title: 'title',
  tags: 'tags',
  description: 'description',
  comment: 'comment',
  connector: 'connector',
  pushed: 'pushed',
  settings: 'settings',
  status: 'status',
};

const getUserActionType = (fields: string[], action: string): string => {
  if (fields.length > 1 && action === 'create') {
    return 'create_case';
  }

  if (fields.length > 1 && action === 'delete') {
    return 'delete_case';
  }

  const field = fields[0];
  return fieldToActionType[field] ?? '';
};

const getMultipleFieldsPayload = (fields: string[], value: string) => {
  if (value == null) {
    return {};
  }

  const decodedValue = JSON.parse(value);

  return fields.reduce(
    (payload, field) => ({ ...payload, ...getSingleFieldPayload(field, decodedValue[field]) }),
    {}
  );
};

const removeOldReferences = (
  references: SavedObjectUnsanitizedDoc<UserActions>['references']
): SavedObjectReference[] =>
  (references ?? []).filter(
    (ref) =>
      ref.name !== USER_ACTION_OLD_ID_REF_NAME && ref.name !== USER_ACTION_OLD_PUSH_ID_REF_NAME
  );

function payloadMigration(
  doc: SavedObjectUnsanitizedDoc<UserActions>,
  context: SavedObjectMigrationContext
): SavedObjectSanitizedDoc<unknown> {
  const { new_value, old_value, action_field, action_at, action_by, action, ...restAttributes } =
    doc.attributes;

  const payload =
    action_field.length > 1
      ? getMultipleFieldsPayload(action_field, new_value ?? old_value)
      : getSingleFieldPayload(action_field[0], new_value ?? old_value);

  const type = getUserActionType(action_field, action);
  const references = removeOldReferences(doc.references);
  const newAction = action === 'push-to-service' ? 'push_to_service' : action;

  return {
    ...doc,
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
