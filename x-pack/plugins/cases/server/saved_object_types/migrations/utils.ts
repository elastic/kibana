/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectReference } from '../../../../../../src/core/server';
import { ACTION_SAVED_OBJECT_TYPE } from '../../../../actions/server';
import { getNoneCaseConnector } from '../../common';
import { connectorIdReferenceName } from '../../services';

export const transformConnectorIdToReference = (connector?: {
  id?: string;
}): { transformedConnector: object; references: SavedObjectReference[] } => {
  const { id: connectorId, ...restConnector } = connector ?? {};

  const references =
    connectorId && connectorId !== 'none'
      ? [
          {
            id: connectorId,
            type: ACTION_SAVED_OBJECT_TYPE,

            name: connectorIdReferenceName,
          },
        ]
      : [];

  const { id: ignoreNoneId, ...restNoneConnector } = getNoneCaseConnector();
  let transformedConnector: object = { connector: restNoneConnector };
  if (connector && connectorId) {
    transformedConnector = { connector: { ...restConnector } };
  }

  return { transformedConnector, references };
};
