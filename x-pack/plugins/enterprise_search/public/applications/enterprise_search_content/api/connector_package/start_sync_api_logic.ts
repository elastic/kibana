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
}

export const startSync = async ({ connectorId }: StartSyncArgs) => {
  const route = `/internal/enterprise_search/connectors/${connectorId}/start_sync`;
  return await HttpLogic.values.http.post(route);
};

export const StartSyncApiLogic = createApiLogic(['start_sync_api_logic'], startSync);
