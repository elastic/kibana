/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ConnectorMappingsAttributes } from '../../../common/api';
import { CaseClientFactoryArguments, MappingsClient } from '../types';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ACTION_SAVED_OBJECT_TYPE } from '../../../../actions/server/saved_objects';

export const getMappings = ({
  savedObjectsClient,
  connectorMappingsService,
}: CaseClientFactoryArguments) => async ({
  actionsClient,
  caseClient,
  connectorType,
  connectorId,
}: MappingsClient): Promise<ConnectorMappingsAttributes[]> => {
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
