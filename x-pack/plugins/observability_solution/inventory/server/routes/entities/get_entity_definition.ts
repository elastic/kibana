/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import { InventoryEntityDefinition } from '../../../common/entities';
import type { InventoryRouteHandlerResources } from '../types';
import { eemToInventoryDefinition } from './eem_to_inventory_definition';
import { fetchEntityDefinitions } from './route';

export function getEntityDefinition({
  request,
  plugins,
  type,
  logger,
}: {
  request: InventoryRouteHandlerResources['request'];
  plugins: {
    entityManager: InventoryRouteHandlerResources['plugins']['entityManager'];
  };
  type: string;
  logger: Logger;
}): Promise<InventoryEntityDefinition | undefined> {
  return fetchEntityDefinitions({
    plugins,
    request,
    logger,
  }).then((response) => {
    const definition = response.definitions.find((def) => def.type === type);
    if (definition) {
      return eemToInventoryDefinition(definition);
    }
    return undefined;
  });
}
