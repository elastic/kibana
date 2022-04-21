/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectTypeRegistry } from '@kbn/core/server';

/**
 * This function returns any importable/exportable saved object types that are namespace-agnostic. Even if these are eligible for
 * import/export, we should not include them in the copy operation because it will result in a conflict that needs to overwrite itself to be
 * resolved.
 */
export function getIneligibleTypes(
  typeRegistry: Pick<
    SavedObjectTypeRegistry,
    'getImportableAndExportableTypes' | 'isNamespaceAgnostic'
  >
) {
  return typeRegistry
    .getImportableAndExportableTypes()
    .filter((type) => typeRegistry.isNamespaceAgnostic(type.name))
    .map((type) => type.name);
}
