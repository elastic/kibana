/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ACTION_SAVED_OBJECT_TYPE } from '@kbn/actions-plugin/server';
import type { ConnectorMappingsAttributes } from '../../../common/api';
import { createCaseError } from '../../common/error';
import type { CasesClientArgs } from '..';
import type { CreateMappingsArgs } from './types';
import { casesConnectors } from '../../connectors';

export const createMappings = async (
  { connector, owner, refresh }: CreateMappingsArgs,
  clientArgs: CasesClientArgs
): Promise<ConnectorMappingsAttributes[]> => {
  const {
    unsecuredSavedObjectsClient,
    services: { connectorMappingsService },
    logger,
  } = clientArgs;

  try {
    const mappings = casesConnectors.get(connector.type)?.getMapping() ?? [];

    const theMapping = await connectorMappingsService.post({
      unsecuredSavedObjectsClient,
      attributes: {
        mappings,
        owner,
      },
      references: [
        {
          type: ACTION_SAVED_OBJECT_TYPE,
          name: `associated-${ACTION_SAVED_OBJECT_TYPE}`,
          id: connector.id,
        },
      ],
      refresh,
    });

    return theMapping.attributes.mappings;
  } catch (error) {
    throw createCaseError({
      message: `Failed to create mapping connector id: ${connector.id} type: ${connector.type}: ${error}`,
      error,
      logger,
    });
  }
};
