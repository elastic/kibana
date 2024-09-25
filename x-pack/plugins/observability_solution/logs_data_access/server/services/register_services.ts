/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsServiceStart } from '@kbn/core-saved-objects-server';
import { UiSettingsServiceStart } from '@kbn/core-ui-settings-server';
import { Logger } from '@kbn/logging';
import { createGetLogsRateTimeseries } from './get_logs_rate_timeseries/get_logs_rate_timeseries';
import { createGetLogErrorRateTimeseries } from './get_logs_error_rate_timeseries/get_logs_error_rate_timeseries';
import { createGetLogsRatesService } from './get_logs_rates_service';
import { createLogSourcesServiceFactory } from './log_sources_service';

export interface RegisterServicesParams {
  logger: Logger;
  deps: {
    savedObjects: SavedObjectsServiceStart;
    uiSettings: UiSettingsServiceStart;
  };
}

export function registerServices(params: RegisterServicesParams) {
  return {
    getLogsRatesService: createGetLogsRatesService(),
    getLogsRateTimeseries: createGetLogsRateTimeseries(),
    getLogsErrorRateTimeseries: createGetLogErrorRateTimeseries(),
    logSourcesServiceFactory: createLogSourcesServiceFactory(params),
  };
}
