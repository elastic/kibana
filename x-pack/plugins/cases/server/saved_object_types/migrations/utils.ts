/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import { isPlainObject, isString } from 'lodash';
import * as rt from 'io-ts';

import {
  LogMeta,
  SavedObjectMigrationContext,
  SavedObjectReference,
  SavedObjectSanitizedDoc,
  SavedObjectUnsanitizedDoc,
} from '../../../../../../src/core/server';
import {
  Actions,
  ActionTypes,
  CaseAttributes,
  CaseConnector,
  CaseConnectorRt,
  CaseExternalServiceBasicRt,
  CommentType,
  noneConnectorId,
  UserActionTypes,
} from '../../../common/api';
import {
  CONNECTOR_ID_REFERENCE_NAME,
  PUSH_CONNECTOR_ID_REFERENCE_NAME,
  USER_ACTION_OLD_ID_REF_NAME,
  USER_ACTION_OLD_PUSH_ID_REF_NAME,
} from '../../common/constants';
import { getNoneCaseConnector } from '../../common/utils';
import { ACTION_SAVED_OBJECT_TYPE } from '../../../../actions/server';
import { UserActions, UserActionUnmigratedConnectorDocument } from './types';

// Generic util functions
export function logError({
  id,
  context,
  error,
  docType,
  docKey,
}: {
  id: string;
  context: SavedObjectMigrationContext;
  error: Error;
  docType: string;
  docKey: string;
}) {
  context.log.error<MigrationLogMeta>(
    `Failed to migrate ${docType} with doc id: ${id} version: ${context.migrationVersion} error: ${error.message}`,
    {
      migrations: {
        [docKey]: {
          id,
        },
      },
    }
  );
}

// 7.16 util functions

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
  id != null && id !== noneConnectorId;

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

interface MigrationLogMeta extends LogMeta {
  migrations: {
    [x: string]: {
      id: string;
    };
  };
}

export function isConnectorUserAction(action?: string, actionFields?: string[]): boolean {
  return (
    isCreateConnector(action, actionFields) ||
    isUpdateConnector(action, actionFields) ||
    isPush(action, actionFields)
  );
}

export function formatDocumentWithConnectorReferences(
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

// 8.1.0 migration util functions

const getSingleFieldPayload = (
  field: string,
  value: string | null,
  owner: string
): Record<string, unknown> => {
  const decodeValue = (v: string | null) => {
    try {
      return isString(v) ? JSON.parse(v) : value ?? {};
    } catch {
      return value;
    }
  };

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
      /**
       * Until 7.10 the new_value of the comment user action
       * was a string. In 7.11+ more fields were introduced to the comment's
       * saved object and the new_value of the user actions changes to an
       * stringify object. At that point of time no migrations were made to
       * the user actions to accommodate the new formatting.
       *
       * We are taking care of it in this migration.
       * If there response of the decodeValue function is not an object
       * then we assume that the value is a string coming for a 7.10
       * user action saved object.
       */
      const decodedValue = decodeValue(value);
      return {
        comment: isPlainObject(decodedValue)
          ? decodedValue
          : { comment: isString(decodedValue) ? decodedValue : '', type: CommentType.user, owner },
      };
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

export const getUserActionType = (fields: string[], action: string): string => {
  if (fields.length > 1 && action === Actions.create) {
    return ActionTypes.create_case;
  }

  if (fields.length > 1 && action === Actions.delete) {
    return ActionTypes.delete_case;
  }

  const field = fields[0] as UserActionTypes;
  return ActionTypes[field] ?? '';
};

const getMultipleFieldsPayload = (
  fields: string[],
  value: string | null,
  owner: string
): Record<string, unknown> => {
  if (value == null) {
    return {};
  }

  const decodedValue = JSON.parse(value);

  return fields.reduce(
    (payload, field) => ({
      ...payload,
      ...getSingleFieldPayload(field, decodedValue[field], owner),
    }),
    {}
  );
};

export const getPayload = (
  type: string,
  action_field: string[],
  new_value: string | null,
  old_value: string | null,
  owner: string
): Record<string, unknown> => {
  const payload =
    action_field.length > 1
      ? getMultipleFieldsPayload(action_field, new_value ?? old_value ?? null, owner)
      : getSingleFieldPayload(action_field[0], new_value ?? old_value ?? null, owner);

  /**
   * From 7.10+ the cases saved object has the connector attribute
   * Create case user actions did not get migrated to have the
   * connector attribute included.
   *
   * We are taking care of it in this migration by adding the none
   * connector as a default
   */
  return {
    ...payload,
    ...(payload.connector == null &&
    (type === ActionTypes.create_case || type === ActionTypes.connector)
      ? { connector: { name: 'none', type: '.none', fields: null } }
      : {}),
  };
};

export const removeOldReferences = (
  references: SavedObjectUnsanitizedDoc<UserActions>['references']
): SavedObjectReference[] =>
  (references ?? []).filter(
    (ref) =>
      ref.name !== USER_ACTION_OLD_ID_REF_NAME && ref.name !== USER_ACTION_OLD_PUSH_ID_REF_NAME
  );
