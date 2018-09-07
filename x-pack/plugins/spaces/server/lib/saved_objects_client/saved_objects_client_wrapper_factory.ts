/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SpacesService } from '../create_spaces_service';
import { SavedObjectsClient } from './saved_objects_client_types';
import { SpacesSavedObjectsClient } from './spaces_saved_objects_client';

interface SOCWrapperOptions {
  client: SavedObjectsClient;
  request: any;
}

type SOCWrapperFactory = (options: SOCWrapperOptions) => SavedObjectsClient;

export function spacesSavedObjectsClientWrapperFactory(
  spacesService: SpacesService
): SOCWrapperFactory {
  return ({ client, request }: SOCWrapperOptions) =>
    new SpacesSavedObjectsClient({
      baseClient: client,
      request,
      spacesService,
    });
}
