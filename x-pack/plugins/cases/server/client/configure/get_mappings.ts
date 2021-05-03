/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract, Logger } from 'src/core/server';
import { ActionsClient } from '../../../../actions/server';
import { ConnectorMappingsAttributes, ConnectorTypes } from '../../../common';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ACTION_SAVED_OBJECT_TYPE } from '../../../../actions/server/saved_objects';
import { ConnectorMappingsServiceSetup } from '../../services';
import { CasesClientHandler } from '..';
import { createCaseError } from '../../common/error';

interface GetMappingsArgs {
  savedObjectsClient: SavedObjectsClientContract;
  connectorMappingsService: ConnectorMappingsServiceSetup;
  actionsClient: ActionsClient;
  casesClient: CasesClientHandler;
  connectorType: string;
  connectorId: string;
  logger: Logger;
}

export const getMappings = async ({
  savedObjectsClient,
  connectorMappingsService,
  actionsClient,
  casesClient,
  connectorType,
  connectorId,
  logger,
}: GetMappingsArgs): Promise<ConnectorMappingsAttributes[]> => {
  try {
    if (connectorType === ConnectorTypes.none) {
      return [];
    }
    const myConnectorMappings = await connectorMappingsService.find({
      client: savedObjectsClient,
      options: {
        hasReference: {
          type: ACTION_SAVED_OBJECT_TYPE,
          id: connectorId,
        },
      },
    });
    let theMapping;
    // Create connector mappings if there are none
    if (
      myConnectorMappings.total === 0 ||
      (myConnectorMappings.total > 0 &&
        !myConnectorMappings.saved_objects[0].attributes.hasOwnProperty('mappings'))
    ) {
      const res = await casesClient.getFields({
        actionsClient,
        connectorId,
        connectorType,
      });
      theMapping = await connectorMappingsService.post({
        client: savedObjectsClient,
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
