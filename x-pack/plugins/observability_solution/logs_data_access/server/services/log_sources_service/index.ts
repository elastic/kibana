/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from '@kbn/core-http-server';
import { OBSERVABILITY_LOGS_DATA_ACCESS_LOG_SOURCES_ID } from '@kbn/management-settings-ids';
import { LogSource } from '../../../common/types';
import { RegisterServicesParams } from '../register_services';

export function createGetLogSourcesService(params: RegisterServicesParams) {
  return async (request: KibanaRequest) => {
    const { savedObjects, uiSettings } = params.deps;
    const soClient = savedObjects.getScopedClient(request);
    const uiSettingsClient = uiSettings.asScopedToClient(soClient);
    return {
      getLogSources: async (): Promise<LogSource[]> => {
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
  };
}
