/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsUtils } from '@kbn/core/server';

/**
 * Converts a Space ID string to its namespace ID representation. Note that a Space ID string is equivalent to a namespace string.
 *
 * See also: {@link namespaceStringToId}.
 */
export function spaceIdToNamespace(spaceId: string) {
  return SavedObjectsUtils.namespaceStringToId(spaceId);
}

/**
 * Converts a namespace ID to its Space ID string representation. Note that a Space ID string is equivalent to a namespace string.
 *
 * See also: {@link namespaceIdToString}.
 */
export function namespaceToSpaceId(namespace?: string) {
  return SavedObjectsUtils.namespaceIdToString(namespace);
}
