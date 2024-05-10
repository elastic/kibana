/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { OAMDefinition, oamDefinitionSchema } from '@kbn/oam-schema';
import { SO_OAM_DEFINITION_TYPE } from '../../saved_objects';
import { OAMNotFound } from './errors/oam_not_found';

export async function readOAMDefinition(
  soClient: SavedObjectsClientContract,
  id: string,
  logger: Logger
) {
  const response = await soClient.find<OAMDefinition>({
    type: SO_OAM_DEFINITION_TYPE,
    page: 1,
    perPage: 1,
    filter: `${SO_OAM_DEFINITION_TYPE}.attributes.id:(${id})`,
  });
  if (response.total === 0) {
    const message = `Unable to find OAM Defintion with [${id}]`;
    logger.error(message);
    throw new OAMNotFound(message);
  }

  try {
    return oamDefinitionSchema.parse(response.saved_objects[0].attributes);
  } catch (e) {
    logger.error(`Unable to parse OAM Defintion with [${id}]`);
    throw e;
  }
}
