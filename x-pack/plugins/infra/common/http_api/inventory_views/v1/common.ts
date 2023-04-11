/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const INVENTORY_VIEW_URL_PREFIX = '/api/infra/log_views';
export const INVENTORY_VIEW_URL = `${INVENTORY_VIEW_URL_PREFIX}/{inventoryViewId}`;
export const getInventoryViewUrl = (inventoryViewId: string) =>
  `${INVENTORY_VIEW_URL_PREFIX}/${inventoryViewId}`;
