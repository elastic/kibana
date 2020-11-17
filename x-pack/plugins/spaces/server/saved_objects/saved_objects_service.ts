/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup } from 'src/core/server';
import { SpacesSavedObjectMappings, SpacesTelemetryMappings } from './mappings';
import { migrateToKibana660 } from './migrations';
import { spacesSavedObjectsClientWrapperFactory } from './saved_objects_client_wrapper_factory';
import { SpacesServiceStart } from '../spaces_service';
import { SPACES_TELEMETRY_TYPE } from '../constants';

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
        '6.6.0': migrateToKibana660,
      },
    });

    core.savedObjects.registerType({
      name: SPACES_TELEMETRY_TYPE,
      hidden: true,
      namespaceType: 'agnostic',
      mappings: SpacesTelemetryMappings,
    });

    core.savedObjects.addClientWrapper(
      Number.MIN_SAFE_INTEGER,
      'spaces',
      spacesSavedObjectsClientWrapperFactory(getSpacesService)
    );
  }
}
