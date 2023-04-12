/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InventoryViewReference } from '../../../common/inventory_views';
import { createResolvedInventoryViewMock } from '../../../common/inventory_views/resolved_Inventory_view.mock';
import { IInventoryViewsClient } from './types';

export const createInventoryViewsClientMock = (): jest.Mocked<IInventoryViewsClient> => ({
  getInventoryView: jest.fn(),
  getResolvedInventoryView: jest.fn((inventoryViewReference: InventoryViewReference) =>
    Promise.resolve(createResolvedInventoryViewMock())
  ),
  putInventoryView: jest.fn(),
  resolveInventoryView: jest.fn(),
});
