/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../lib/level_logger');

import { loggingSystemMock } from 'src/core/server/mocks';
import { LevelLogger } from '../lib/level_logger';

export function createMockLevelLogger() {
  // eslint-disable-next-line no-console
  const consoleLogger = (tag: string) => (message: unknown) => console.log(tag, message);

  const logger = new LevelLogger(loggingSystemMock.create()) as jest.Mocked<LevelLogger>;

  logger.clone.mockImplementation(createMockLevelLogger);
  logger.debug.mockImplementation(consoleLogger('debug'));
  logger.info.mockImplementation(consoleLogger('info'));
  logger.warn.mockImplementation(consoleLogger('warn'));
  logger.warning = jest.fn().mockImplementation(consoleLogger('warn'));
  logger.error.mockImplementation(consoleLogger('error'));
  logger.trace.mockImplementation(consoleLogger('trace'));

  return logger;
}
