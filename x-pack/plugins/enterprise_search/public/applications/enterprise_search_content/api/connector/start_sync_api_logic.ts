/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createApiLogic } from '../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../shared/http';

export interface StartSyncArgs {
  connectorId: string;
  nextSyncConfig?: object;
}

export const startSync = async ({ connectorId, nextSyncConfig }: StartSyncArgs) => {
  const route = `/internal/enterprise_search/connectors/${connectorId}/start_sync`;
  return await HttpLogic.values.http.post(route, {
    // nextSyncConfig will be stored as a JSON string
    body: JSON.stringify({ nextSyncConfig: JSON.stringify(nextSyncConfig) }),
  });
};

export const StartSyncApiLogic = createApiLogic(['start_sync_api_logic'], startSync);
