/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsFindResponse } from '@kbn/core/server';
import { ACTION_SAVED_OBJECT_TYPE } from '@kbn/actions-plugin/server';
import type { ConnectorMappings } from '../../../common/api';
import { createCaseError } from '../../common/error';
import type { CasesClientArgs } from '..';
import type { MappingsArgs } from './types';

export const getMappings = async (
  { connector }: MappingsArgs,
  clientArgs: CasesClientArgs
): Promise<SavedObjectsFindResponse<ConnectorMappings>['saved_objects']> => {
  const {
    unsecuredSavedObjectsClient,
    services: { connectorMappingsService },
    logger,
  } = clientArgs;

  try {
    const myConnectorMappings = await connectorMappingsService.find({
      unsecuredSavedObjectsClient,
      options: {
        hasReference: {
          type: ACTION_SAVED_OBJECT_TYPE,
          id: connector.id,
        },
      },
    });

    return myConnectorMappings.saved_objects;
  } catch (error) {
    throw createCaseError({
      message: `Failed to retrieve mapping connector id: ${connector.id} type: ${connector.type}: ${error}`,
      error,
      logger,
    });
  }
};
