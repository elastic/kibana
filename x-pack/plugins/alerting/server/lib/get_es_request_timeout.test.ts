/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { getEsRequestTimeout } from './get_es_request_timeout';

describe('getEsRequestTimeout', () => {
  const logger = loggingSystemMock.create().get();
  test('should return undefined if the timeout is not passed in', () => {
    expect(getEsRequestTimeout(logger)).toBe(undefined);
  });
  test('should return timeout in ms', () => {
    expect(getEsRequestTimeout(logger, '5s')).toBe(5000);
  });
  test('should return timeout that is not > 5m', () => {
    expect(getEsRequestTimeout(logger, '10m')).toBe(300000);
  });
  test('should log error and return undefined for invalid timeout', () => {
    expect(getEsRequestTimeout(logger, '5z')).toBe(undefined);
    expect(logger.debug).toBeCalledTimes(1);
    expect(logger.debug).toBeCalledWith(
      'Invalid format for the rule ES requestTimeout duration: "5z"'
    );
  });
});
