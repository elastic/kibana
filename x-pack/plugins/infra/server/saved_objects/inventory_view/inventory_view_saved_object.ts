/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fold } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import type { SavedObject, SavedObjectsType } from '@kbn/core/server';
import { inventoryViewSavedObjectRT } from './types';

export const inventoryViewSavedObjectName = 'inventory-view';

const getInventoryViewTitle = (savedObject: SavedObject<unknown>) =>
  pipe(
    inventoryViewSavedObjectRT.decode(savedObject),
    fold(
      () => `Inventory view [id=${savedObject.id}]`,
      ({ attributes: { name } }) => name
    )
  );

export const inventoryViewSavedObjectType: SavedObjectsType = {
  name: inventoryViewSavedObjectName,
  hidden: false,
  namespaceType: 'single',
  management: {
    defaultSearchField: 'name',
    displayName: 'inventory view',
    getTitle: getInventoryViewTitle,
    icon: 'metricsApp',
    importableAndExportable: true,
  },
  mappings: {
    dynamic: false,
    properties: {},
  },
};
