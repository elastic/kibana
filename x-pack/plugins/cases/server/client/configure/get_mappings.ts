/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract, Logger } from 'src/core/server';
import { ActionConnector, ConnectorMappingsAttributes, ConnectorTypes } from '../../../common/api';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ACTION_SAVED_OBJECT_TYPE } from '../../../../actions/server/saved_objects';
import { ConnectorMappingsService } from '../../services';
import { createCaseError } from '../../common/error';
import { CaseConnectors } from '../../connectors';
import { isConnectorSupported } from '../utils';

interface GetMappingsArgs {
  savedObjectsClient: SavedObjectsClientContract;
  connectorMappingsService: ConnectorMappingsService;
  connector: ActionConnector;
  logger: Logger;
  casesConnectors: CaseConnectors;
}

export const getMappings = async ({
  savedObjectsClient,
  connectorMappingsService,
  connector,
  logger,
  casesConnectors,
}: GetMappingsArgs): Promise<ConnectorMappingsAttributes[]> => {
  try {
    if (connector.actionTypeId === ConnectorTypes.none) {
      return [];
    }

    if (!isConnectorSupported(connector.actionTypeId)) {
      throw new Error('Invalid external service');
    }

    const myConnectorMappings = await connectorMappingsService.find({
      soClient: savedObjectsClient,
      options: {
        hasReference: {
          type: ACTION_SAVED_OBJECT_TYPE,
          id: connector.id,
        },
      },
    });

    let theMapping;
    // Create connector mappings if there are none
    if (myConnectorMappings.total === 0) {
      const mappings =
        casesConnectors[connector.actionTypeId] != null && connector != null
          ? casesConnectors[connector.actionTypeId].getMapping(connector)
          : [];

      theMapping = await connectorMappingsService.post({
        soClient: savedObjectsClient,
        attributes: {
          mappings,
        },
        references: [
          {
            type: ACTION_SAVED_OBJECT_TYPE,
            name: `associated-${ACTION_SAVED_OBJECT_TYPE}`,
            id: connector.id,
          },
        ],
      });
    } else {
      theMapping = myConnectorMappings.saved_objects[0];
    }
    return theMapping ? theMapping.attributes.mappings : [];
  } catch (error) {
    throw createCaseError({
      message: `Failed to retrieve mapping connector id: ${connector.id} type: ${connector.actionTypeId}: ${error}`,
      error,
      logger,
    });
  }
};
