/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import { registerGetLogsIndices } from './get_logs_indices';
import { createGetLogsRateService } from './get_logs_rate_service';

export interface RegisterServicesParams {
  logger: Logger;
  deps: {};
}

export function registerServices(params: RegisterServicesParams) {
  return {
    getLogsIndices: registerGetLogsIndices(params),
    getLogsRateService: createGetLogsRateService(params),
  };
}
