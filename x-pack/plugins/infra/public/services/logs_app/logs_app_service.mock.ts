/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createLogsAppClientMock } from './logs_app_client.mock';
import { LogsAppServiceStart } from './types';

export const createLogsAppServiceStartMock = () => ({
  client: createLogsAppClientMock(),
  isLogsUiApp: jest.fn(),
  isDiscoverApp: jest.fn(),
});

export const _ensureTypeCompatibility = (): LogsAppServiceStart => createLogsAppServiceStartMock();
