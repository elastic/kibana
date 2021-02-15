/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsServiceSetup } from 'kibana/server';
import mappings from './mappings.json';
import { migrations } from './migrations';
import { TaskManagerConfig } from '../config.js';

export function setupSavedObjects(
  savedObjects: SavedObjectsServiceSetup,
  config: TaskManagerConfig
) {
  savedObjects.registerType({
    name: 'task',
    namespaceType: 'agnostic',
    hidden: true,
    convertToAliasScript: `ctx._id = ctx._source.type + ':' + ctx._id`,
    mappings: mappings.task,
    migrations,
    indexPattern: config.index,
  });
}
