/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InventoryItemType } from './types';
import type { LogsLocatorParams } from './logs_locator';

export const NODE_LOGS_LOCATOR_ID = 'NODE_LOGS_LOCATOR';

export interface NodeLogsLocatorParams extends LogsLocatorParams {
  nodeId: string;
  nodeType: InventoryItemType;
}
