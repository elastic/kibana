/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createLogger } from './logger';

/* tslint:disable:no-any */

const APP_ID = 'secops';
const createMockServer = () => ({ log: jest.fn() });

describe('logger', () => {
  describe('#createLogger', () => {
    test('should log out debug', () => {
      const kbnServer = createMockServer();
      const logger = createLogger(kbnServer as any);
      logger.debug('debug information');
      expect(kbnServer.log.mock.calls[0][0]).toEqual(['debug', APP_ID]);
      expect(kbnServer.log.mock.calls[0][1]).toEqual('debug information');
    });

    test('should log out info', () => {
      const kbnServer = createMockServer();
      const logger = createLogger(kbnServer as any);
      logger.info('info information');
      expect(kbnServer.log.mock.calls[0][0]).toEqual(['info', APP_ID]);
      expect(kbnServer.log.mock.calls[0][1]).toEqual('info information');
    });

    test('should log out warn', () => {
      const kbnServer = createMockServer();
      const logger = createLogger(kbnServer as any);
      logger.warn('warn information');
      expect(kbnServer.log.mock.calls[0][0]).toEqual(['warning', APP_ID]);
      expect(kbnServer.log.mock.calls[0][1]).toEqual('warn information');
    });

    test('should log out error', () => {
      const kbnServer = createMockServer();
      const logger = createLogger(kbnServer as any);
      logger.error('error information');
      expect(kbnServer.log.mock.calls[0][0]).toEqual(['error', APP_ID]);
      expect(kbnServer.log.mock.calls[0][1]).toEqual('error information');
    });
  });
});
