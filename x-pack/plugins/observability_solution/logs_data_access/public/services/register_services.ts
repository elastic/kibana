/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { createLogSourcesService } from './log_sources_service';

export interface RegisterServicesParams {
  deps: {
    uiSettings: IUiSettingsClient;
  };
}

export function registerServices(params: RegisterServicesParams) {
  return {
    logSourcesService: createLogSourcesService(params),
  };
}
