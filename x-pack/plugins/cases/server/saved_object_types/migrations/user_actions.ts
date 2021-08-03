/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';

import { addOwnerToSO, SanitizedCaseOwner } from '.';
import {
  SavedObjectUnsanitizedDoc,
  SavedObjectSanitizedDoc,
  SavedObjectReference,
} from '../../../../../../src/core/server';
import {
  CaseAttributes,
  CaseConnector,
  CaseConnectorRt,
  CaseUserActionAttributesRt,
  ConnectorTypes,
} from '../../../common';
import { transformConnectorIdToReference } from './utils';

interface UserActions {
  action_field: string[];
  new_value: string;
  old_value: string;
}

export function userActionsConnectorIdMigration(
  doc: SavedObjectUnsanitizedDoc<{
    action?: string;
    action_field?: string[];
    new_value?: string | null;
    old_value?: string | null;
  }>
): SavedObjectSanitizedDoc<unknown> {
  if (!isConnectorUserAction(doc.attributes.action, doc.attributes.action_field)) {
    return { ...doc, references: doc.references ?? [] };
  }

  const { new_value, old_value, ...restAttributes } = doc.attributes;
  const { references = [] } = doc;

  return {
    ...doc,
    attributes: {
      ...restAttributes,
    },
    references: [...references],
  };
}

function isConnectorUserAction(action?: string, actionFields?: string[]): boolean {
  return (
    isCreateConnector(action, actionFields) ||
    isUpdateConnector(action, actionFields) ||
    isPush(action, actionFields)
  );
}

function isCreateConnector(action?: string, actionFields?: string[]): boolean {
  return action === 'create' && actionFields?.includes('connector') === true;
}

function isUpdateConnector(action?: string, actionFields?: string[]): boolean {
  return action === 'update' && actionFields?.includes('connector') === true;
}

function isPush(action?: string, actionFields?: string[]): boolean {
  return action === 'push-to-service' && actionFields?.includes('pushed') === true;
}

export function extractConnectorIdFromJson({
  action,
  actionFields,
  jsonBlob,
}: {
  action?: string;
  actionFields?: string[];
  jsonBlob?: string | null;
} = {}): { transformedJson: string; references: SavedObjectReference[] } | undefined {
  if (!action || !actionFields || !jsonBlob) {
    return;
  }

  try {
    const decodedJson = JSON.parse(jsonBlob);

    if (isCreateCaseConnector(action, actionFields, decodedJson)) {
      const { transformedConnector, references } = transformConnectorIdToReference(decodedJson);
      return {
        transformedJson: JSON.stringify(transformedConnector),
        references,
      };
    } else if (isUpdateCaseConnector(action, actionFields, decodedJson)) {
      const { transformedConnector, references } = transformConnectorIdToReference(decodedJson);
      return {
        transformedJson: JSON.stringify(transformedConnector),
        references,
      };
    }
  } catch (error) {
    return;
  }
}

function isCreateCaseConnector(
  action: string,
  actionFields: string[],
  decodedJson: unknown
): decodedJson is CaseConnector {
  try {
    const unsafeCase = decodedJson as CaseAttributes;

    return (
      isCreateConnector(action, actionFields) &&
      unsafeCase.connector !== undefined &&
      CaseConnectorRt.is(unsafeCase.connector)
    );
  } catch {
    return false;
  }
}

function isUpdateCaseConnector(
  action: string,
  actionFields: string[],
  decodedJson: unknown
): decodedJson is CaseConnector {
  try {
    return isUpdateConnector(action, actionFields) && CaseConnectorRt.is(decodedJson);
  } catch {
    return false;
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
  '7.15.0': userActionsConnectorIdMigration,
};
