/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ACTION_SAVED_OBJECT_TYPE } from '@kbn/actions-plugin/server';
import type { GetDefaultMappingsResponse } from '../../../common/api';
import { decodeOrThrow, GetDefaultMappingsResponseRt } from '../../../common/api';
import { createCaseError } from '../../common/error';
import type { CasesClientArgs } from '..';
import type { MappingsArgs } from './types';

export const getMappings = async (
  { connector }: MappingsArgs,
  clientArgs: CasesClientArgs
): Promise<GetDefaultMappingsResponse> => {
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

    const res = myConnectorMappings.saved_objects.map((so) => ({
      id: so.id,
      version: so.version,
      ...so.attributes,
    }));

    return decodeOrThrow(GetDefaultMappingsResponseRt)(res);
  } catch (error) {
    throw createCaseError({
      message: `Failed to retrieve mapping connector id: ${connector.id} type: ${connector.type}: ${error}`,
      error,
      logger,
    });
  }
};
