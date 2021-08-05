/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import * as rt from 'io-ts';

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
  CaseExternalServiceBasicRt,
  ConnectorTypes,
} from '../../../common';
import { transformConnectorIdToReference, transformPushConnectorIdToReference } from './utils';

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

  const { new_value, old_value, action, action_field, ...restAttributes } = doc.attributes;
  const { references = [] } = doc;

  const {
    transformedJson: transformedNewValue,
    references: newValueRefs,
  } = extractConnectorIdFromJson({
    action,
    actionFields: action_field,
    stringifiedJson: new_value,
  }) ?? { transformedJson: new_value, references: [] };

  const {
    transformedJson: transformedOldValue,
    references: oldValueRefs,
  } = extractConnectorIdFromJson({
    action,
    actionFields: action_field,
    stringifiedJson: old_value,
  }) ?? { transformedJson: old_value, references: [] };

  return {
    ...doc,
    attributes: {
      ...restAttributes,
      action,
      action_field,
      new_value: transformedNewValue,
      old_value: transformedOldValue,
    },
    references: [...references, ...newValueRefs, ...oldValueRefs],
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

interface ExtractedConnector {
  transformedJson: string;
  references: SavedObjectReference[];
}

export function extractConnectorIdFromJson({
  action,
  actionFields,
  stringifiedJson,
}: {
  action?: string;
  actionFields?: string[];
  stringifiedJson?: string | null;
} = {}): ExtractedConnector | undefined {
  if (!action || !actionFields || !stringifiedJson) {
    return;
  }

  try {
    const decodedJson = JSON.parse(stringifiedJson);

    if (isCreateCaseConnector(action, actionFields, decodedJson)) {
      return transformCreateConnector(decodedJson.connector);
    } else if (isUpdateCaseConnector(action, actionFields, decodedJson)) {
      return transformUpdateConnector(decodedJson);
    } else if (isPushConnector(action, actionFields, decodedJson)) {
      return transformPushConnector(decodedJson);
    }
  } catch (error) {
    // ignore any throws from parsing or transforming the connectors and just return undefined
  }
}

function isCreateCaseConnector(
  action: string,
  actionFields: string[],
  decodedJson: unknown
): decodedJson is { connector: CaseConnector } {
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

function transformCreateConnector(connector: CaseConnector): ExtractedConnector {
  const { transformedConnector, references } = transformConnectorIdToReference(connector);

  return {
    transformedJson: JSON.stringify(transformedConnector),
    references,
  };
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

function transformUpdateConnector(connector: CaseConnector): ExtractedConnector {
  const { transformedConnector, references } = transformConnectorIdToReference(connector);

  return {
    transformedJson: JSON.stringify(transformedConnector.connector),
    references,
  };
}

type CaseExternalService = rt.TypeOf<typeof CaseExternalServiceBasicRt>;

function isPushConnector(
  action: string,
  actionFields: string[],
  decodedJson: unknown
): decodedJson is CaseExternalService {
  try {
    return isPush(action, actionFields) && CaseExternalServiceBasicRt.is(decodedJson);
  } catch {
    return false;
  }
}

function transformPushConnector(externalService: CaseExternalService): ExtractedConnector {
  const { transformedPushConnector, references } = transformPushConnectorIdToReference(
    externalService
  );

  return {
    transformedJson: JSON.stringify(transformedPushConnector),
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
  '7.15.0': userActionsConnectorIdMigration,
};
