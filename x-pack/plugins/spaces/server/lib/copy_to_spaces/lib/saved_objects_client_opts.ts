/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientProviderOptions } from 'src/core/server';

export const COPY_TO_SPACES_SAVED_OBJECTS_CLIENT_OPTS: SavedObjectsClientProviderOptions = {
  excludedWrappers: ['spaces'],
};
