/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toKibanaLogger } from './logger';

const createLog = () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
});

describe('toKibanaLogger', () => {
  it('routes each level to the matching test log level', () => {
    const log = createLog();
    const logger = toKibanaLogger(log);

    logger.trace('t');
    logger.debug('d');
    logger.info('i');
    logger.warn('w');
    logger.error('e');
    logger.fatal('f');

    expect(log.debug.mock.calls).toEqual([['t'], ['d']]);
    expect(log.info).toHaveBeenCalledWith('i');
    expect(log.warning).toHaveBeenCalledWith('w');
    expect(log.error.mock.calls).toEqual([['e'], ['f']]);
  });

  it('writes the text of an error and of a lazy message', () => {
    const log = createLog();
    const logger = toKibanaLogger(log);

    logger.error(new Error('boom'));
    logger.debug(() => 'lazy');

    expect(log.error).toHaveBeenCalledWith('boom');
    expect(log.debug).toHaveBeenCalledWith('lazy');
  });

  it('returns itself for a child logger', () => {
    const logger = toKibanaLogger(createLog());

    expect(logger.get('child')).toBe(logger);
  });
});
