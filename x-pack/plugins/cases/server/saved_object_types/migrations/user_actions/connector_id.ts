/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import * as rt from 'io-ts';

import {
  SavedObjectMigrationContext,
  SavedObjectReference,
  SavedObjectSanitizedDoc,
  SavedObjectUnsanitizedDoc,
} from '../../../../../../../src/core/server';
import {
  CaseAttributes,
  CaseConnector,
  CaseConnectorRt,
  CaseExternalServiceBasicRt,
  NONE_CONNECTOR_ID,
} from '../../../../common/api';
import {
  CONNECTOR_ID_REFERENCE_NAME,
  PUSH_CONNECTOR_ID_REFERENCE_NAME,
} from '../../../common/constants';
import { getNoneCaseConnector } from '../../../common/utils';
import { ACTION_SAVED_OBJECT_TYPE } from '../../../../../actions/server';
import { UserActionVersion800 } from './types';
import { logError } from '../utils';
import { USER_ACTION_OLD_ID_REF_NAME, USER_ACTION_OLD_PUSH_ID_REF_NAME } from './constants';

export function isCreateConnector(action?: string, actionFields?: string[]): boolean {
  return action === 'create' && actionFields != null && actionFields.includes('connector');
}

export function isUpdateConnector(action?: string, actionFields?: string[]): boolean {
  return action === 'update' && actionFields != null && actionFields.includes('connector');
}

export function isPush(action?: string, actionFields?: string[]): boolean {
  return action === 'push-to-service' && actionFields != null && actionFields.includes('pushed');
}

/**
 * Indicates whether which user action field is being parsed, the new_value or the old_value.
 */
export enum UserActionFieldType {
  New = 'New',
  Old = 'Old',
}

/**
 * Extracts the connector id from a json encoded string and formats it as a saved object reference. This will remove
 * the field it extracted the connector id from.
 */
export function extractConnectorIdFromJson({
  action,
  actionFields,
  actionDetails,
  fieldType,
}: {
  action?: string;
  actionFields?: string[];
  actionDetails?: string | null;
  fieldType: UserActionFieldType;
}): { transformedActionDetails?: string | null; references: SavedObjectReference[] } {
  if (!action || !actionFields || !actionDetails) {
    return { transformedActionDetails: actionDetails, references: [] };
  }

  const decodedJson = JSON.parse(actionDetails);

  return extractConnectorIdHelper({
    action,
    actionFields,
    actionDetails: decodedJson,
    fieldType,
  });
}

/**
 * Internal helper function for extracting the connector id. This is only exported for usage in unit tests.
 * This function handles encoding the transformed fields as a json string
 */
export function extractConnectorIdHelper({
  action,
  actionFields,
  actionDetails,
  fieldType,
}: {
  action: string;
  actionFields: string[];
  actionDetails: unknown;
  fieldType: UserActionFieldType;
}): { transformedActionDetails: string; references: SavedObjectReference[] } {
  let transformedActionDetails: unknown = actionDetails;
  let referencesToReturn: SavedObjectReference[] = [];

  try {
    if (isCreateCaseConnector(action, actionFields, actionDetails)) {
      const { transformedActionDetails: transformedConnectorPortion, references } =
        transformConnectorFromCreateAndUpdateAction(actionDetails.connector, fieldType);

      // the above call only transforms the connector portion of the action details so let's add back
      // the rest of the details and we'll overwrite the connector portion when the transformed one
      transformedActionDetails = {
        ...actionDetails,
        ...transformedConnectorPortion,
      };
      referencesToReturn = references;
    } else if (isUpdateCaseConnector(action, actionFields, actionDetails)) {
      const {
        transformedActionDetails: { connector: transformedConnector },
        references,
      } = transformConnectorFromCreateAndUpdateAction(actionDetails, fieldType);

      transformedActionDetails = transformedConnector;
      referencesToReturn = references;
    } else if (isPushConnector(action, actionFields, actionDetails)) {
      ({ transformedActionDetails, references: referencesToReturn } =
        transformConnectorFromPushAction(actionDetails, fieldType));
    }
  } catch (error) {
    // ignore any errors, we'll just return whatever was passed in for action details in that case
  }

  return {
    transformedActionDetails: JSON.stringify(transformedActionDetails),
    references: referencesToReturn,
  };
}

export function isCreateCaseConnector(
  action: string,
  actionFields: string[],
  actionDetails: unknown
): actionDetails is { connector: CaseConnector } {
  try {
    const unsafeCase = actionDetails as CaseAttributes;

    return (
      isCreateConnector(action, actionFields) &&
      unsafeCase.connector !== undefined &&
      CaseConnectorRt.is(unsafeCase.connector)
    );
  } catch {
    return false;
  }
}

export const ConnectorIdReferenceName: Record<UserActionFieldType, ConnectorIdRefNameType> = {
  [UserActionFieldType.New]: CONNECTOR_ID_REFERENCE_NAME,
  [UserActionFieldType.Old]: USER_ACTION_OLD_ID_REF_NAME,
};

export function transformConnectorFromCreateAndUpdateAction(
  connector: CaseConnector,
  fieldType: UserActionFieldType
): {
  transformedActionDetails: { connector: unknown };
  references: SavedObjectReference[];
} {
  const { transformedConnector, references } = transformConnectorIdToReference(
    ConnectorIdReferenceName[fieldType],
    connector
  );

  return {
    transformedActionDetails: transformedConnector,
    references,
  };
}

type ConnectorIdRefNameType =
  | typeof CONNECTOR_ID_REFERENCE_NAME
  | typeof USER_ACTION_OLD_ID_REF_NAME;

export const transformConnectorIdToReference = (
  referenceName: ConnectorIdRefNameType,
  connector?: {
    id?: string;
  }
): {
  transformedConnector: { connector: unknown };
  references: SavedObjectReference[];
} => {
  const { id: connectorId, ...restConnector } = connector ?? {};

  const references = createConnectorReference(connectorId, ACTION_SAVED_OBJECT_TYPE, referenceName);

  const { id: ignoreNoneId, ...restNoneConnector } = getNoneCaseConnector();
  const connectorFieldsToReturn =
    connector && isConnectorIdValid(connectorId) ? restConnector : restNoneConnector;

  return {
    transformedConnector: {
      connector: connectorFieldsToReturn,
    },
    references,
  };
};

const createConnectorReference = (
  id: string | null | undefined,
  type: string,
  name: string
): SavedObjectReference[] => {
  return isConnectorIdValid(id)
    ? [
        {
          id,
          type,
          name,
        },
      ]
    : [];
};

const isConnectorIdValid = (id: string | null | undefined): id is string =>
  id != null && id !== NONE_CONNECTOR_ID;

function isUpdateCaseConnector(
  action: string,
  actionFields: string[],
  actionDetails: unknown
): actionDetails is CaseConnector {
  try {
    return isUpdateConnector(action, actionFields) && CaseConnectorRt.is(actionDetails);
  } catch {
    return false;
  }
}

type CaseExternalService = rt.TypeOf<typeof CaseExternalServiceBasicRt>;

function isPushConnector(
  action: string,
  actionFields: string[],
  actionDetails: unknown
): actionDetails is CaseExternalService {
  try {
    return isPush(action, actionFields) && CaseExternalServiceBasicRt.is(actionDetails);
  } catch {
    return false;
  }
}

export const PushConnectorIdReferenceName: Record<UserActionFieldType, PushConnectorIdRefNameType> =
  {
    [UserActionFieldType.New]: PUSH_CONNECTOR_ID_REFERENCE_NAME,
    [UserActionFieldType.Old]: USER_ACTION_OLD_PUSH_ID_REF_NAME,
  };

function transformConnectorFromPushAction(
  externalService: CaseExternalService,
  fieldType: UserActionFieldType
): {
  transformedActionDetails: {} | null;
  references: SavedObjectReference[];
} {
  const { transformedPushConnector, references } = transformPushConnectorIdToReference(
    PushConnectorIdReferenceName[fieldType],
    externalService
  );

  return {
    transformedActionDetails: transformedPushConnector.external_service,
    references,
  };
}

type PushConnectorIdRefNameType =
  | typeof PUSH_CONNECTOR_ID_REFERENCE_NAME
  | typeof USER_ACTION_OLD_PUSH_ID_REF_NAME;

export const transformPushConnectorIdToReference = (
  referenceName: PushConnectorIdRefNameType,
  external_service?: { connector_id?: string | null } | null
): {
  transformedPushConnector: { external_service: {} | null };
  references: SavedObjectReference[];
} => {
  const { connector_id: pushConnectorId, ...restExternalService } = external_service ?? {};

  const references = createConnectorReference(
    pushConnectorId,
    ACTION_SAVED_OBJECT_TYPE,
    referenceName
  );

  return {
    transformedPushConnector: { external_service: external_service ? restExternalService : null },
    references,
  };
};

export function isConnectorUserAction(action?: string, actionFields?: string[]): boolean {
  return (
    isCreateConnector(action, actionFields) ||
    isUpdateConnector(action, actionFields) ||
    isPush(action, actionFields)
  );
}

export function formatDocumentWithConnectorReferences(
  doc: SavedObjectUnsanitizedDoc<UserActionVersion800>
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

// 8.1.0 migration util functions
export function userActionsConnectorIdMigration(
  doc: SavedObjectUnsanitizedDoc<UserActionVersion800>,
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
