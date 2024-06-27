/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defaultDataViewFindHandler } from './dataview.handlers.mock';
import { defaultFleetCspPackageHandler } from './fleet.handlers.mock';
import { defaultApiLicensingInfo } from './licensing.handlers.mock';

/**
 * Default handlers for the mock server, these are the handlers that are always enabled
 * when the mock server is started, but can be overridden by specific tests when needed.
 * Recommended to use these handlers for common endpoints.
 */
export const defaultHandlers = [
  defaultApiLicensingInfo,
  defaultDataViewFindHandler,
  defaultFleetCspPackageHandler,
];
