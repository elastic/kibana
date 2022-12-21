/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SPACES_EXTENSION_ID } from '@kbn/core-saved-objects-server';
import type { SavedObjectsClientProviderOptions } from '@kbn/core/server';

export const COPY_TO_SPACES_SAVED_OBJECTS_CLIENT_OPTS: SavedObjectsClientProviderOptions = {
  excludedExtensions: [SPACES_EXTENSION_ID],
};
