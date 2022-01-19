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
import {
  isPush,
  isUpdateConnector,
  isCreateConnector,
  isCreateComment,
} from '../../../common/utils/user_actions';
import { CommentRequestAlertType, CommentType, ConnectorTypes } from '../../../common/api';

import { extractConnectorIdFromJson } from '../../services/user_actions/transform';
import { UserActionFieldType } from '../../services/user_actions/types';
import { logError } from './utils';

interface UserActions {
  action_field: string[];
  new_value: string;
  old_value: string;
}

/**
 * An interface for the values we need from a json blob style user action to determine what type of
 * user action it is.
 */
interface TypedAndValueUserAction {
  action?: string;
  action_field?: string[];
  new_value?: string | null;
  old_value?: string | null;
}

export function userActionsConnectorIdMigration(
  doc: SavedObjectUnsanitizedDoc<TypedAndValueUserAction>,
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

function isConnectorUserAction(action?: string, actionFields?: string[]): boolean {
  return (
    isCreateConnector(action, actionFields) ||
    isUpdateConnector(action, actionFields) ||
    isPush(action, actionFields)
  );
}

function formatDocumentWithConnectorReferences(
  doc: SavedObjectUnsanitizedDoc<TypedAndValueUserAction>
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

export function removeRuleInformation(
  doc: SavedObjectUnsanitizedDoc<TypedAndValueUserAction>,
  context: SavedObjectMigrationContext
): SavedObjectSanitizedDoc<unknown> {
  const originalDocWithReferences = { ...doc, references: doc.references ?? [] };

  try {
    const { new_value, action, action_field } = doc.attributes;

    const decodedNewValueData = decodeNewValue(new_value);

    if (!isAlertUserAction(action, action_field, decodedNewValueData)) {
      return originalDocWithReferences;
    }

    const encodedValue = JSON.stringify({
      ...decodedNewValueData,
      rule: {
        id: null,
        name: null,
      },
    });

    return {
      ...doc,
      attributes: {
        ...doc.attributes,
        new_value: encodedValue,
      },
      references: doc.references ?? [],
    };
  } catch (error) {
    logError({
      id: doc.id,
      context,
      error,
      docType: 'user action alerts',
      docKey: 'userAction',
    });

    return originalDocWithReferences;
  }
}

function decodeNewValue(data?: string | null): unknown | null {
  if (data === undefined || data === null) {
    return null;
  }

  return JSON.parse(data);
}

function isAlertUserAction(
  action?: string,
  actionFields?: string[],
  newValue?: unknown | null
): newValue is AlertCommentOptional {
  return isCreateComment(action, actionFields) && isAlertObject(newValue);
}

type AlertCommentOptional = Partial<CommentRequestAlertType>;

function isAlertObject(data?: unknown | null): boolean {
  const unsafeAlertData = data as AlertCommentOptional;

  return (
    unsafeAlertData !== undefined &&
    unsafeAlertData !== null &&
    (unsafeAlertData.type === CommentType.generatedAlert ||
      unsafeAlertData.type === CommentType.alert)
  );
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
  /*
   * This is to fix the issue here: https://github.com/elastic/kibana/issues/123089
   * Instead of migrating the rule information in the references array which was risky for 8.0
   * we decided to remove the information since the UI will do the look up for the rule information if
   * the backend returns it as null.
   *
   * The downside is it incurs extra query overhead.
   **/
  '8.0.0': removeRuleInformation,
};
