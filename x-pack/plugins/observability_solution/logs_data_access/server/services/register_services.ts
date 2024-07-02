/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createGetLogsRatesService } from './get_logs_rates_service';
import { createGetLogsRateTimeseries } from './get_logs_rate_timeseries/get_logs_rate_timeseries';
import { createGetLogErrorRateTimeseries } from './get_logs_error_rate_timeseries/get_logs_error_rate_timeseries';

export function registerServices() {
  return {
    getLogsRatesService: createGetLogsRatesService(),
    getLogsRateTimeseries: createGetLogsRateTimeseries(),
    getLogsErrorRateTimeseries: createGetLogErrorRateTimeseries(),
  };
}
