/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import * as rt from 'io-ts';
import { isString } from 'lodash';

import { SavedObjectReference } from '../../../../../../src/core/server';
import { isCreateConnector, isPush, isUpdateConnector } from '../../../common/utils/user_actions';
import {
  CaseAttributes,
  CaseConnector,
  CaseConnectorRt,
  CaseExternalServiceBasicRt,
  noneConnectorId,
} from '../../../common/api';
import {
  CONNECTOR_ID_REFERENCE_NAME,
  PUSH_CONNECTOR_ID_REFERENCE_NAME,
  USER_ACTION_OLD_ID_REF_NAME,
  USER_ACTION_OLD_PUSH_ID_REF_NAME,
} from '../../common/constants';
import { getNoneCaseConnector } from '../../common/utils';
import { ACTION_SAVED_OBJECT_TYPE } from '../../../../actions/server';
import { UserActionFieldType } from './types';

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
 * Extracts the connector id from an unencoded object and formats it as a saved object reference.
 * This will remove the field it extracted the connector id from.
 */
export function extractConnectorId({
  action,
  actionFields,
  actionDetails,
  fieldType,
}: {
  action: string;
  actionFields: string[];
  actionDetails?: Record<string, unknown> | string | null;
  fieldType: UserActionFieldType;
}): {
  transformedActionDetails?: string | null;
  references: SavedObjectReference[];
} {
  if (!actionDetails || isString(actionDetails)) {
    // the action was null, undefined, or a regular string so just return it unmodified and not encoded
    return { transformedActionDetails: actionDetails, references: [] };
  }

  try {
    return extractConnectorIdHelper({
      action,
      actionFields,
      actionDetails,
      fieldType,
    });
  } catch (error) {
    return { transformedActionDetails: encodeActionDetails(actionDetails), references: [] };
  }
}

function encodeActionDetails(actionDetails: Record<string, unknown>): string | null {
  try {
    return JSON.stringify(actionDetails);
  } catch (error) {
    return null;
  }
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

function isCreateCaseConnector(
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

function transformConnectorFromCreateAndUpdateAction(
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
