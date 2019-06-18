/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  SavedObjectsClientWrapperFactory,
  SavedObjectsService,
} from 'src/core/server/saved_objects';
import { SpacesService } from '../create_spaces_service';
import { SpacesSavedObjectsClient } from './spaces_saved_objects_client';
import { createGetNamespace } from './get_namespace';

export function spacesSavedObjectsClientWrapperFactory(
  spacesService: SpacesService,
  savedObjectsService: SavedObjectsService,
  types: string[]
): SavedObjectsClientWrapperFactory {
  return ({ client, request }) =>
    new SpacesSavedObjectsClient({
      baseClient: client,
      request,
      spacesService,
      getNamespace: createGetNamespace(savedObjectsService),
      types,
    });
}
