/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ISavedObjectTypeRegistry, SavedObjectsUtils } from '../../../../../src/core/server';

export const getDescriptorNamespace = (
  typeRegistry: ISavedObjectTypeRegistry,
  type: string,
  namespace?: string | string[]
) => {
  const descriptorNamespace = typeRegistry.isSingleNamespace(type)
    ? Array.isArray(namespace)
      ? namespace[0]
      : namespace
    : undefined;
  return normalizeNamespace(descriptorNamespace);
};

/**
 * Ensure that a namespace is always in its namespace ID representation.
 * This allows `'default'` to be used interchangeably with `undefined`.
 */
const normalizeNamespace = (namespace?: string) =>
  namespace === undefined ? namespace : SavedObjectsUtils.namespaceStringToId(namespace);
