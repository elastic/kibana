/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup } from 'src/core/server';
import { SpacesSavedObjectMappings } from './mappings';
import { migrateToKibana660 } from './migrations';
import { spacesSavedObjectsClientWrapperFactory } from './saved_objects_client_wrapper_factory';
import { SpacesServiceSetup } from '../spaces_service';

interface SetupDeps {
  core: Pick<CoreSetup, 'savedObjects' | 'getStartServices'>;
  spacesService: SpacesServiceSetup;
}

export class SpacesSavedObjectsService {
  public setup({ core, spacesService }: SetupDeps) {
    core.savedObjects.registerType({
      name: 'space',
      hidden: true,
      namespaceType: 'agnostic',
      mappings: SpacesSavedObjectMappings,
      migrations: {
        '6.6.0': migrateToKibana660,
      },
    });

    core.savedObjects.addClientWrapper(
      Number.MIN_SAFE_INTEGER,
      'spaces',
      spacesSavedObjectsClientWrapperFactory(spacesService)
    );
  }
}
