/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  SavedObjectsClientWrapperFactory,
  SavedObjectsClientWrapperOptions,
} from 'src/core/server';
import { SpacesSavedObjectsClient } from './spaces_saved_objects_client';
import { SpacesServiceStart } from '../spaces_service/spaces_service';

export function spacesSavedObjectsClientWrapperFactory(
  getSpacesService: () => SpacesServiceStart
): SavedObjectsClientWrapperFactory {
  return (options: SavedObjectsClientWrapperOptions) =>
    new SpacesSavedObjectsClient({
      baseClient: options.client,
      request: options.request,
      getSpacesService,
      typeRegistry: options.typeRegistry,
    });
}
