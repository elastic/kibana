/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from 'src/core/server';
import { ActionsClient } from '../../../../actions/server';
import { ConnectorMappingsAttributes, ConnectorTypes } from '../../../common/api';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ACTION_SAVED_OBJECT_TYPE } from '../../../../actions/server/saved_objects';
import { ConnectorMappingsServiceSetup } from '../../services';
import { CaseClientImpl } from '..';

interface GetMappingsArgs {
  savedObjectsClient: SavedObjectsClientContract;
  connectorMappingsService: ConnectorMappingsServiceSetup;
  actionsClient: ActionsClient;
  caseClient: CaseClientImpl;
  connectorType: string;
  connectorId: string;
}

export const getMappings = async ({
  savedObjectsClient,
  connectorMappingsService,
  actionsClient,
  caseClient,
  connectorType,
  connectorId,
}: GetMappingsArgs): Promise<ConnectorMappingsAttributes[]> => {
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
  if (myConnectorMappings.total === 0) {
    const res = await caseClient.getFields({
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
};
