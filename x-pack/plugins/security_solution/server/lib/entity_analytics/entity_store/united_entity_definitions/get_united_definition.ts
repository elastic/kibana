/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pipe } from 'fp-ts/lib/function';

import { assign, concat, map, merge, pick, update } from 'lodash/fp';
import type { EntityType } from '../../../../../common/api/entity_analytics';
import type { EntityEngineInstallationDescriptor } from './types';
import { generateIndexMappings } from './united_entity_definition';

import type { EntityStoreConfig } from '../types';
import {
  hostEntityEngineDescription,
  userEntityEngineDescription,
  universalEntityEngineDescription,
} from './entity_types';

const engineDescriptionRegistry: Record<EntityType, EntityEngineInstallationDescriptor> = {
  host: hostEntityEngineDescription,
  user: userEntityEngineDescription,
  universal: universalEntityEngineDescription,
  service: getServiceUnitedDefinition,
};

export const getAvailableEntityTypes = () => Object.keys(engineDescriptionRegistry) as EntityType[];

interface EngineDescriptionDependencies {
  entityType: EntityType;
  namespace: string;
  fieldHistoryLength?: number;
  indexPatterns: string[];
  config: EntityStoreConfig;
}

export const contextualizeEngineDescription = (_deps: EngineDescriptionDependencies) => {
  const deps = merge({ fieldHistoryLength: 10 }, _deps);
  const description = engineDescriptionRegistry[deps.entityType];

  const updatedDescription = pipe(
    description,
    update('indexPatterns', concat(deps.indexPatterns)),
    update('settings', assign(pick(['syncDelay', 'frequency'], deps.config))),
    update(
      'fields',
      map(
        merge({
          retention_operator: { maxLength: deps.fieldHistoryLength },
          aggregation: { limit: deps.fieldHistoryLength },
        })
      )
    )
  ) as EntityEngineInstallationDescriptor;

  updatedDescription.indexMappings = generateIndexMappings(updatedDescription);

  return updatedDescription;
};
