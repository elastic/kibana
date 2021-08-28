/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectsServiceSetup } from '../../../../../src/core/server/saved_objects/saved_objects_service';
import {
  ML_MODULE_SAVED_OBJECT_TYPE,
  ML_SAVED_OBJECT_TYPE,
} from '../../common/types/saved_objects';
import { mlJob, mlModule } from './mappings';
import { migrations } from './migrations';

export function setupSavedObjects(savedObjects: SavedObjectsServiceSetup) {
  savedObjects.registerType({
    name: ML_SAVED_OBJECT_TYPE,
    hidden: false,
    namespaceType: 'multiple',
    migrations,
    mappings: mlJob,
  });
  savedObjects.registerType({
    name: ML_MODULE_SAVED_OBJECT_TYPE,
    hidden: false,
    namespaceType: 'agnostic',
    migrations,
    mappings: mlModule,
  });
}
