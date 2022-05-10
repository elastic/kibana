/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import get from 'lodash/get';
import {
  SavedObjectsType,
  ISavedObjectTypeRegistry,
  SavedObjectsFindResult,
  Capabilities,
} from '@kbn/core/server';
import { GlobalSearchProviderResult } from '@kbn/global-search-plugin/server';

export const mapToResults = (
  objects: Array<SavedObjectsFindResult<unknown>>,
  registry: ISavedObjectTypeRegistry,
  capabilities: Capabilities
): GlobalSearchProviderResult[] => {
  return objects
    .filter((obj) => isAccessible(obj, registry.getType(obj.type)!, capabilities))
    .map((obj) => mapToResult(obj, registry.getType(obj.type)!));
};

const isAccessible = (
  object: SavedObjectsFindResult<unknown>,
  type: SavedObjectsType,
  capabilities: Capabilities
): boolean => {
  const { getInAppUrl } = type.management ?? {};
  if (getInAppUrl === undefined) {
    throw new Error('Trying to map an object from a type without management metadata');
  }
  const { uiCapabilitiesPath } = getInAppUrl(object);
  return Boolean(get(capabilities, uiCapabilitiesPath) ?? false);
};

export const mapToResult = (
  object: SavedObjectsFindResult<unknown>,
  type: SavedObjectsType
): GlobalSearchProviderResult => {
  const { defaultSearchField, getInAppUrl } = type.management ?? {};
  if (defaultSearchField === undefined || getInAppUrl === undefined) {
    throw new Error('Trying to map an object from a type without management metadata');
  }
  return {
    id: object.id,
    // defaultSearchField is dynamic and not 'directly' bound to the generic type of the SavedObject
    // so we are forced to cast the attributes to any to access the properties associated with it.
    title: (object.attributes as any)[defaultSearchField],
    type: object.type,
    icon: type.management?.icon ?? undefined,
    url: getInAppUrl(object).path,
    score: object.score,
    meta: {
      tagIds: object.references.filter((ref) => ref.type === 'tag').map(({ id }) => id),
      displayName: type.management?.displayName ?? object.type,
    },
  };
};
