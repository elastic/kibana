/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConnectorMappingsAttributes, ConnectorTypes } from '../../../common/api';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ACTION_SAVED_OBJECT_TYPE } from '../../../../actions/server/saved_objects';
import { createCaseError } from '../../common/error';
import { CasesClientArgs, CasesClientInternal } from '..';

interface GetMappingsArgs {
  connectorType: string;
  connectorId: string;
}

export const getMappings = async (
  { connectorType, connectorId }: GetMappingsArgs,
  clientArgs: CasesClientArgs,
  casesClientInternal: CasesClientInternal
): Promise<ConnectorMappingsAttributes[]> => {
  const { savedObjectsClient, connectorMappingsService, logger } = clientArgs;

  try {
    if (connectorType === ConnectorTypes.none) {
      return [];
    }
    const myConnectorMappings = await connectorMappingsService.find({
      soClient: savedObjectsClient,
      options: {
        hasReference: {
          type: ACTION_SAVED_OBJECT_TYPE,
          id: connectorId,
        },
      },
    });
    let theMapping;
    // Create connector mappings if there are none
    if (myConnectorMappings.total === 0) {
      const res = await casesClientInternal.configuration.getFields({
        connectorId,
        connectorType,
      });
      theMapping = await connectorMappingsService.post({
        soClient: savedObjectsClient,
        attributes: {
          mappings: res.defaultMappings,
        },
        references: [
          {
            type: ACTION_SAVED_OBJECT_TYPE,
            name: `associated-${ACTION_SAVED_OBJECT_TYPE}`,
            id: connectorId,
          },
        ],
      });
    } else {
      theMapping = myConnectorMappings.saved_objects[0];
    }
    return theMapping ? theMapping.attributes.mappings : [];
  } catch (error) {
    throw createCaseError({
      message: `Failed to retrieve mapping connector id: ${connectorId} type: ${connectorType}: ${error}`,
      error,
      logger,
    });
  }
};
