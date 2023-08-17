/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createLogsSharedLogEntriesDomainMock } from './lib/domains/log_entries_domain/log_entries_domain.mock';
import {
  createLogViewsServiceSetupMock,
  createLogViewsServiceStartMock,
} from './services/log_views/log_views_service.mock';
import { LogsSharedPluginSetup, LogsSharedPluginStart } from './types';

const createLogsSharedSetupMock = () => {
  const logsSharedSetupMock: jest.Mocked<LogsSharedPluginSetup> = {
    logViews: createLogViewsServiceSetupMock(),
    logEntries: createLogsSharedLogEntriesDomainMock(),
    registerUsageCollectorActions: jest.fn(),
  };

  return logsSharedSetupMock;
};

const createLogsSharedStartMock = () => {
  const logsSharedStartMock: jest.Mocked<LogsSharedPluginStart> = {
    logViews: createLogViewsServiceStartMock(),
  };
  return logsSharedStartMock;
};

export const logsSharedPluginMock = {
  createSetupContract: createLogsSharedSetupMock,
  createStartContract: createLogsSharedStartMock,
};
