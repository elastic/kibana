/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { OBSERVABILITY_LOGS_DATA_ACCESS_LOG_SOURCES_ID } from '@kbn/management-settings-ids';
import { LogSource, LogSourcesService } from '../../../common/services/log_sources_service/types';
import { RegisterServicesParams } from '../register_services';

export function createLogSourcesServiceFactory(params: RegisterServicesParams) {
  return {
    async getLogSourcesService(
      savedObjectsClient: SavedObjectsClientContract
    ): Promise<LogSourcesService> {
      const { uiSettings } = params.deps;
      const uiSettingsClient = uiSettings.asScopedToClient(savedObjectsClient);
      return {
        getLogSources: async () => {
          const logSources = await uiSettingsClient.get<string[]>(
            OBSERVABILITY_LOGS_DATA_ACCESS_LOG_SOURCES_ID
          );
          return logSources.map((logSource) => ({
            indexPattern: logSource,
          }));
        },
        setLogSources: async (sources: LogSource[]) => {
          return await uiSettingsClient.set(
            OBSERVABILITY_LOGS_DATA_ACCESS_LOG_SOURCES_ID,
            sources.map((source) => source.indexPattern)
          );
        },
      };
    },
    async getScopedLogSourcesService(request: KibanaRequest): Promise<LogSourcesService> {
      const { savedObjects } = params.deps;
      const soClient = savedObjects.getScopedClient(request);
      return this.getLogSourcesService(soClient);
    },
  };
}
