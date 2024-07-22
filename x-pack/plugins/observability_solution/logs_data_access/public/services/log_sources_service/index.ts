/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OBSERVABILITY_LOGS_DATA_ACCESS_LOG_SOURCES_ID } from '@kbn/management-settings-ids';
import { LogSource } from '../../../common/types';
import { RegisterServicesParams } from '../register_services';

export function createLogSourcesService(params: RegisterServicesParams) {
  const { uiSettings } = params.deps;
  return {
    getLogSources: (): LogSource[] => {
      const logSources = uiSettings.get<string[]>(OBSERVABILITY_LOGS_DATA_ACCESS_LOG_SOURCES_ID);
      return logSources.map((logSource) => ({
        indexPattern: logSource,
      }));
    },
    setLogSources: async (sources: LogSource[]) => {
      return await uiSettings.set(
        OBSERVABILITY_LOGS_DATA_ACCESS_LOG_SOURCES_ID,
        sources.map((source) => source.indexPattern)
      );
    },
  };
}
