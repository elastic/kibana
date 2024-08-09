/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_NAMESPACE_STRING } from '@kbn/core-saved-objects-utils-server';
import type { SavedObjectsClientContract } from '@kbn/core/server';

/*
 * soClient.getCurrentNamespace() returns undefined in the default space.
 * This helper returns the name of the current space and 'default' in the default space.
 */
export function getCurrentNamespace(soClient: SavedObjectsClientContract) {
  return soClient.getCurrentNamespace() ?? DEFAULT_NAMESPACE_STRING;
}
