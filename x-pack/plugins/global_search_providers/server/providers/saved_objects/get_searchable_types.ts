/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISavedObjectTypeRegistry, SavedObjectsType } from '@kbn/core/server';

export const getSearchableTypes = (typeRegistry: ISavedObjectTypeRegistry, types?: string[]) => {
  const typeFilter = types
    ? (type: SavedObjectsType) => {
        if (type.management?.displayName && isTypeMatching(types, type.management.displayName)) {
          return true;
        }
        return isTypeMatching(types, type.name);
      }
    : () => true;

  return typeRegistry
    .getVisibleTypes()
    .filter(typeFilter)
    .filter((type) => type.management?.defaultSearchField && type.management?.getInAppUrl);
};

const isTypeMatching = (list: string[], item: string) =>
  list.some((e) => toCompareFormat(e) === toCompareFormat(item));

const toCompareFormat = (str: string) => str.toLowerCase().replace(/\s/g, '-');
