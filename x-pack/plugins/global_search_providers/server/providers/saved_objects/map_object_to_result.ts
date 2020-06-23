/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  SavedObjectsType,
  ISavedObjectTypeRegistry,
  SavedObjectsFindResult,
} from 'src/core/server';
import { GlobalSearchProviderResult } from '../../../../global_search/server';

export const mapToResults = (
  objects: Array<SavedObjectsFindResult<unknown>>,
  registry: ISavedObjectTypeRegistry
): GlobalSearchProviderResult[] => {
  return objects.map((obj) => mapToResult(obj, registry.getType(obj.type)!));
};

export const mapToResult = (
  object: SavedObjectsFindResult<unknown>,
  type: SavedObjectsType
): GlobalSearchProviderResult => {
  const { defaultSearchField, getInAppUrl } = type.management!;

  return {
    id: object.id,
    title: (object.attributes as any)[defaultSearchField!],
    type: object.type,
    url: getInAppUrl!(object).path,
    score: object.score,
  };
};
