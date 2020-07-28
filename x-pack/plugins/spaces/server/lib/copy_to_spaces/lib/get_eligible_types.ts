/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectTypeRegistry } from 'src/core/server';

export function getEligibleTypes(
  typeRegistry: Pick<SavedObjectTypeRegistry, 'getAllTypes' | 'isNamespaceAgnostic'>
) {
  return typeRegistry
    .getAllTypes()
    .filter((type) => !typeRegistry.isNamespaceAgnostic(type.name))
    .map((type) => type.name);
}
