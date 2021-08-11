/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import { noneConnectorId } from '../../../common';
import { SavedObjectReference } from '../../../../../../src/core/server';
import { ACTION_SAVED_OBJECT_TYPE } from '../../../../actions/server';
import {
  getNoneCaseConnector,
  CONNECTOR_ID_REFERENCE_NAME,
  PUSH_CONNECTOR_ID_REFERENCE_NAME,
  USER_ACTION_OLD_ID_REF_NAME,
  USER_ACTION_OLD_PUSH_ID_REF_NAME,
} from '../../common';

export type ConnectorIdReferenceName =
  | typeof CONNECTOR_ID_REFERENCE_NAME
  | typeof USER_ACTION_OLD_ID_REF_NAME;

export const transformConnectorIdToReference = (
  referenceName: ConnectorIdReferenceName,
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

export type PushConnectorIdReferenceName =
  | typeof PUSH_CONNECTOR_ID_REFERENCE_NAME
  | typeof USER_ACTION_OLD_PUSH_ID_REF_NAME;

export const transformPushConnectorIdToReference = (
  referenceName: PushConnectorIdReferenceName,
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
