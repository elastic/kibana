/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createLogAIAssistantMock } from './components/log_ai_assistant/log_ai_assistant.mock';
import { createLogViewsServiceStartMock } from './services/log_views/log_views_service.mock';
import { LogsSharedClientStartExports } from './types';

export const createLogsSharedPluginStartMock = (): jest.Mocked<LogsSharedClientStartExports> => ({
  logViews: createLogViewsServiceStartMock(),
  LogAIAssistant: createLogAIAssistantMock(),
});

export const _ensureTypeCompatibility = (): LogsSharedClientStartExports =>
  createLogsSharedPluginStartMock();
