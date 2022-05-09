/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';

import type { SpacesServiceStart } from '../spaces_service';
import { SPACES_USAGE_STATS_TYPE } from '../usage_stats';
import { SpacesSavedObjectMappings, UsageStatsMappings } from './mappings';
import { spaceMigrations, usageStatsMigrations } from './migrations';
import { spacesSavedObjectsClientWrapperFactory } from './saved_objects_client_wrapper_factory';

interface SetupDeps {
  core: Pick<CoreSetup, 'savedObjects' | 'getStartServices'>;
  getSpacesService: () => SpacesServiceStart;
}

export class SpacesSavedObjectsService {
  public setup({ core, getSpacesService }: SetupDeps) {
    core.savedObjects.registerType({
      name: 'space',
      hidden: true,
      namespaceType: 'agnostic',
      mappings: SpacesSavedObjectMappings,
      migrations: {
        '6.6.0': spaceMigrations.migrateTo660,
      },
    });

    core.savedObjects.registerType({
      name: SPACES_USAGE_STATS_TYPE,
      hidden: true,
      namespaceType: 'agnostic',
      mappings: UsageStatsMappings,
      migrations: {
        '7.14.1': usageStatsMigrations.migrateTo7141,
      },
    });

    core.savedObjects.addClientWrapper(
      Number.MIN_SAFE_INTEGER,
      'spaces',
      spacesSavedObjectsClientWrapperFactory(getSpacesService)
    );
  }
}
