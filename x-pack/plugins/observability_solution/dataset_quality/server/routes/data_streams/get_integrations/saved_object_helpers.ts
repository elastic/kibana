/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SavedObjectsBulkGetObject,
  SavedObjectsClientContract,
  SavedObjectsFindOptions,
} from '@kbn/core-saved-objects-api-server';
import {
  Installation,
  PACKAGES_SAVED_OBJECT_TYPE,
  SO_SEARCH_LIMIT,
} from '@kbn/fleet-plugin/common';

export const getIntegrationInstalledSavedObjects = async (
  savedObjectsClient: SavedObjectsClientContract,
  integration: string,
  options?: Omit<SavedObjectsFindOptions, 'type'>
) =>
  savedObjectsClient.find<Installation>({
    ...(options || {}),
    type: PACKAGES_SAVED_OBJECT_TYPE,
    filter: `${PACKAGES_SAVED_OBJECT_TYPE}.attributes.name: "${integration}"`,
    fields: [`installed_kibana`],
    perPage: SO_SEARCH_LIMIT,
  });

export const getBulkSavedObjects = (
  savedObjectsClient: SavedObjectsClientContract,
  objects: SavedObjectsBulkGetObject[]
) =>
  savedObjectsClient.bulkGet<{
    title?: string;
  }>(objects);
