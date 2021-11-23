/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISavedObjectTypeRegistry, SavedObjectsType } from 'src/core/server';

export const getSearchableTypes = (typeRegistry: ISavedObjectTypeRegistry, types?: string[]) => {
  const typeFilter = types
    ? (type: SavedObjectsType) => {
        if (type.management?.displayName && includeIgnoreCase(types, type.management.displayName)) {
          return true;
        }
        return includeIgnoreCase(types, type.name);
      }
    : () => true;

  return typeRegistry
    .getVisibleTypes()
    .filter(typeFilter)
    .filter((type) => type.management?.defaultSearchField && type.management?.getInAppUrl);
};

const includeIgnoreCase = (list: string[], item: string) =>
  list.find((e) => e.toLowerCase() === item.toLowerCase()) !== undefined;
