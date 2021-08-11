/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import * as rt from 'io-ts';

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
  noneConnectorId,
} from '../../../common';
import {
  CONNECTOR_ID_REFERENCE_NAME,
  getNoneCaseConnector,
  PUSH_CONNECTOR_ID_REFERENCE_NAME,
  USER_ACTION_OLD_ID_REF_NAME,
  USER_ACTION_OLD_PUSH_ID_REF_NAME,
} from '../../common';
import { ACTION_SAVED_OBJECT_TYPE } from '../../../../actions/server';

export enum UserActionFieldType {
  New = 'New',
  Old = 'Old',
}

const ConnectorIdReferenceName: Record<UserActionFieldType, ConnectorIdRefNameType> = {
  [UserActionFieldType.New]: CONNECTOR_ID_REFERENCE_NAME,
  [UserActionFieldType.Old]: USER_ACTION_OLD_ID_REF_NAME,
};

const PushConnectorIdReferenceName: Record<UserActionFieldType, PushConnectorIdRefNameType> = {
  [UserActionFieldType.New]: PUSH_CONNECTOR_ID_REFERENCE_NAME,
  [UserActionFieldType.Old]: USER_ACTION_OLD_PUSH_ID_REF_NAME,
};

export function extractConnectorIdFromObject({
  action,
  actionFields,
  actionDetails,
  fieldType,
}: {
  action: string;
  actionFields: string[];
  actionDetails: unknown;
  fieldType: UserActionFieldType;
}): ExtractedConnector {
  if (actionDetails === null || actionDetails === undefined) {
    return { transformedJson: actionDetails, references: [] };
  }

  try {
    if (isCreateCaseConnector(action, actionFields, actionDetails)) {
      return transformCreateConnector(actionDetails.connector, fieldType);
    } else if (isUpdateCaseConnector(action, actionFields, actionDetails)) {
      return transformUpdateConnector(actionDetails, fieldType);
    } else if (isPushConnector(action, actionFields, actionDetails)) {
      return transformPushConnector(actionDetails, fieldType);
    }
  } catch (error) {
    // ignore any throws from parsing or transforming the connectors and just return undefined
  }

  // TODO: should we throw here? probably, need to catch this in the migration code though
  return { transformedJson: JSON.stringify(actionDetails), references: [] };
}

export type ConnectorIdRefNameType =
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
    connector && references.length > 0 ? restConnector : restNoneConnector;

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
  return id && id !== noneConnectorId
    ? [
        {
          id,
          type,
          name,
        },
      ]
    : [];
};

interface ExternalService {
  external_service: {} | null;
}

export type PushConnectorIdRefNameType =
  | typeof PUSH_CONNECTOR_ID_REFERENCE_NAME
  | typeof USER_ACTION_OLD_PUSH_ID_REF_NAME;

export const transformPushConnectorIdToReference = (
  referenceName: PushConnectorIdRefNameType,
  external_service?: { connector_id?: string | null } | null
): { transformedPushConnector: ExternalService; references: SavedObjectReference[] } => {
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

export function isCreateCaseConnector(
  action: string,
  actionFields: string[],
  // TODO: rename these
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

interface ExtractedConnector {
  transformedJson?: string | null;
  references: SavedObjectReference[];
}

export function transformCreateConnector(
  connector: CaseConnector,
  fieldType: UserActionFieldType
): ExtractedConnector {
  const { transformedConnector, references } = transformConnectorIdToReference(
    ConnectorIdReferenceName[fieldType],
    connector
  );

  return {
    transformedJson: JSON.stringify(transformedConnector),
    references,
  };
}

export function isUpdateCaseConnector(
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

export function transformUpdateConnector(
  connector: CaseConnector,
  fieldType: UserActionFieldType
): ExtractedConnector {
  const { transformedConnector, references } = transformConnectorIdToReference(
    ConnectorIdReferenceName[fieldType],
    connector
  );

  return {
    transformedJson: JSON.stringify(transformedConnector.connector),
    references,
  };
}

type CaseExternalService = rt.TypeOf<typeof CaseExternalServiceBasicRt>;

export function isPushConnector(
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

export function transformPushConnector(
  externalService: CaseExternalService,
  fieldType: UserActionFieldType
): ExtractedConnector {
  const { transformedPushConnector, references } = transformPushConnectorIdToReference(
    PushConnectorIdReferenceName[fieldType],
    externalService
  );

  return {
    transformedJson: JSON.stringify(transformedPushConnector.external_service),
    references,
  };
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
