/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IEventLogService } from './types';
import { eventLoggerMock } from './event_logger.mock';

const createEventLogServiceMock = () => {
  const mock: jest.Mocked<IEventLogService> = {
    isEnabled: jest.fn(),
    isLoggingEntries: jest.fn(),
    isIndexingEntries: jest.fn(),
    registerProviderActions: jest.fn(),
    isProviderActionRegistered: jest.fn(),
    getProviderActions: jest.fn(),
    registerSavedObjectProvider: jest.fn(),
    getLogger: jest.fn().mockReturnValue(eventLoggerMock.create()),
  };
  return mock;
};

export const eventLogServiceMock = {
  create: createEventLogServiceMock,
};
