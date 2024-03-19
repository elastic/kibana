/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { staticInventoryViewAttributes } from './defaults';
import type { InventoryView, InventoryViewAttributes } from './types';

export const createInventoryViewMock = (
  id: string,
  attributes: InventoryViewAttributes,
  updatedAt?: number,
  version?: string
): InventoryView => ({
  id,
  attributes: {
    ...staticInventoryViewAttributes,
    ...attributes,
  },
  updatedAt,
  version,
});
