/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { OAMDefinition } from '@kbn/oam-schema';
import { SO_OAM_DEFINITION_TYPE } from '../../saved_objects';
import { OAMNotFound } from './errors/oam_not_found';

export async function deleteOAMDefinition(
  soClient: SavedObjectsClientContract,
  definition: OAMDefinition,
  logger: Logger
) {
  const response = await soClient.find<OAMDefinition>({
    type: SO_OAM_DEFINITION_TYPE,
    page: 1,
    perPage: 1,
    filter: `${SO_OAM_DEFINITION_TYPE}.attributes.id:(${definition.id})`,
  });

  if (response.total === 0) {
    logger.error(`Unable to delete OAM Definition [${definition.id}] because it doesn't exist.`);
    throw new OAMNotFound(`OAM Defintion with [${definition.id}] not found.`);
  }

  await soClient.delete(SO_OAM_DEFINITION_TYPE, response.saved_objects[0].id);
}
