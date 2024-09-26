/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OBSERVABILITY_LOGS_DATA_ACCESS_LOG_SOURCES_ID } from '@kbn/management-settings-ids';
import { flattenLogSources } from '../../../common/services/log_sources_service/utils';
import { LogSource, LogSourcesService } from '../../../common/services/log_sources_service/types';
import { RegisterServicesParams } from '../register_services';

export function createLogSourcesService(params: RegisterServicesParams): LogSourcesService {
  const { uiSettings } = params.deps;
  return {
    async getLogSources() {
      const logSources = uiSettings.get<string[]>(OBSERVABILITY_LOGS_DATA_ACCESS_LOG_SOURCES_ID);
      return logSources.map((logSource) => ({
        indexPattern: logSource,
      }));
    },
    async getFlattenedLogSources() {
      const logSources = await this.getLogSources();
      return flattenLogSources(logSources);
    },
    async setLogSources(sources: LogSource[]) {
      await uiSettings.set(
        OBSERVABILITY_LOGS_DATA_ACCESS_LOG_SOURCES_ID,
        sources.map((source) => source.indexPattern)
      );
      return;
    },
  };
}
