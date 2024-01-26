/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IInventoryViewsClient } from './types';

export const createInventoryViewsClientMock = (): jest.Mocked<IInventoryViewsClient> => ({
  findInventoryViews: jest.fn(),
  getInventoryView: jest.fn(),
  createInventoryView: jest.fn(),
  updateInventoryView: jest.fn(),
  deleteInventoryView: jest.fn(),
});
