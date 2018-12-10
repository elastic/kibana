/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientWrapperFactory } from 'src/server/saved_objects';
import { SpacesService } from '../create_spaces_service';
import { SpacesSavedObjectsClient } from './spaces_saved_objects_client';

export function spacesSavedObjectsClientWrapperFactory(
  spacesService: SpacesService,
  types: string[]
): SavedObjectsClientWrapperFactory {
  return ({ client, request }) =>
    new SpacesSavedObjectsClient({
      baseClient: client,
      request,
      spacesService,
      types,
    });
}
