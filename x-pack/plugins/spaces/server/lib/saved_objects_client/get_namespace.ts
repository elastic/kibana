/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsBaseOptions, SavedObjectsService } from 'src/core/server/saved_objects';
import { DEFAULT_SPACE_ID } from '../../../common/constants';

export const createGetNamespace = (savedObjectsService: SavedObjectsService) => {
  return function getNamespace(operationOptions: SavedObjectsBaseOptions, currentSpaceId: string) {
    if (operationOptions.namespace) {
      return operationOptions.namespace;
    }
    if (currentSpaceId === DEFAULT_SPACE_ID) {
      return savedObjectsService.createNamespace();
    }
    return savedObjectsService.createNamespace(currentSpaceId);
  };
};
