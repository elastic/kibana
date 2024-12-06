/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient, Logger } from '@kbn/core/server';
import { storeTypeDefinition } from './type_definition';
import { storeSourceDefinition } from './source_definition';
import { EntitySourceDefinition, EntityTypeDefinition } from '../types';

interface BuiltInDefinition {
  type: EntityTypeDefinition;
  sources: EntitySourceDefinition[];
}

const builtInDefinitions: BuiltInDefinition[] = [];

export async function installBuiltInDefinitions(
  clusterClient: IScopedClusterClient,
  logger: Logger
) {
  logger.debug('Installing built in entity definitions');

  // This flow does /not/ support updates
  for (const definition of builtInDefinitions) {
    const { type, sources } = definition;

    try {
      await storeTypeDefinition(type, clusterClient, logger);
    } catch (error) {
      logger.debug(error.message);
    }

    for (const source of sources) {
      try {
        await storeSourceDefinition(source, clusterClient, logger);
      } catch (error) {
        logger.debug(error.message);
      }
    }
  }

  logger.debug(`Installed ${builtInDefinitions.length} entity definitions`);
}
