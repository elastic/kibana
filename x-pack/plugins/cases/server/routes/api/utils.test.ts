/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isBoom, boomify } from '@hapi/boom';
import { loggingSystemMock } from '../../../../../../src/core/server/mocks';
import { HTTPError } from '../../common/error';
import { extractWarningValueFromWarningHeader, logDeprecatedEndpoint, wrapError } from './utils';

describe('Utils', () => {
  describe('wrapError', () => {
    it('wraps an error', () => {
      const error = new Error('Something happened');
      const res = wrapError(error);

      expect(isBoom(res.body as Error)).toBe(true);
    });

    it('it set statusCode to 500', () => {
      const error = new Error('Something happened');
      const res = wrapError(error);

      expect(res.statusCode).toBe(500);
    });

    it('it set statusCode to errors status code', () => {
      const error = new Error('Something happened') as HTTPError;
      error.statusCode = 404;
      const res = wrapError(error);

      expect(res.statusCode).toBe(404);
    });

    it('it accepts a boom error', () => {
      const error = boomify(new Error('Something happened'));
      const res = wrapError(error);

      // Utils returns the same boom error as body
      expect(res.body).toBe(error);
    });

    it('it accepts a boom error with status code', () => {
      const error = boomify(new Error('Something happened'), { statusCode: 404 });
      const res = wrapError(error);

      expect(res.statusCode).toBe(404);
    });

    it('it returns empty headers', () => {
      const error = new Error('Something happened');
      const res = wrapError(error);

      expect(res.headers).toEqual({});
    });
  });

  describe('logDeprecatedEndpoint', () => {
    const logger = loggingSystemMock.createLogger();
    const kibanaHeader = { 'kbn-version': '8.1.0', referer: 'test' };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('does NOT log when the request is from the kibana client', () => {
      logDeprecatedEndpoint(logger, kibanaHeader, 'test');
      expect(logger.warn).not.toHaveBeenCalledWith('test');
    });

    it('does log when the request is NOT from the kibana client', () => {
      logDeprecatedEndpoint(logger, {}, 'test');
      expect(logger.warn).toHaveBeenCalledWith('test');
    });
  });

  describe('extractWarningValueFromWarningHeader', () => {
    it('extracts the warning value from a warning header correctly', () => {
      expect(extractWarningValueFromWarningHeader(`299 Kibana-8.1.0 "Deprecation endpoint"`)).toBe(
        'Deprecation endpoint'
      );
    });
  });
});
