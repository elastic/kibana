/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import get from 'lodash/get';
import {
  SavedObjectsType,
  ISavedObjectTypeRegistry,
  SavedObjectsFindResult,
  Capabilities,
} from 'src/core/server';
import { GlobalSearchProviderResult } from '../../../../global_search/server';

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
    url: getInAppUrl(object).path,
    score: object.score,
  };
};
