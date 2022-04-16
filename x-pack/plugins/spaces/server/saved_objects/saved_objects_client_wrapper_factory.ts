/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObjectsClientWrapperFactory,
  SavedObjectsClientWrapperOptions,
} from '@kbn/core/server';

import type { SpacesServiceStart } from '../spaces_service/spaces_service';
import { SpacesSavedObjectsClient } from './spaces_saved_objects_client';

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
