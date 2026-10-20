/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { handleRouteError } from './handle_route_error';

function makeLogger(): jest.Mocked<Pick<Logger, 'error'>> {
  return { error: jest.fn() };
}

function makeResponse() {
  return {
    customError: jest.fn().mockReturnValue({ type: 'customError' }),
  };
}

describe('handleRouteError', () => {
  it('logs the message and error text', () => {
    const logger = makeLogger();
    const response = makeResponse();

    handleRouteError({
      error: new Error('boom'),
      logger: logger as unknown as Logger,
      response: response as any,
      message: 'Something failed',
    });

    expect(logger.error).toHaveBeenCalledWith('Something failed: boom');
  });

  it('logs non-Error values as strings', () => {
    const logger = makeLogger();
    const response = makeResponse();

    handleRouteError({
      error: 'a string error',
      logger: logger as unknown as Logger,
      response: response as any,
      message: 'Op failed',
    });

    expect(logger.error).toHaveBeenCalledWith('Op failed: a string error');
  });

  it('returns statusCode 500 for a generic Error', () => {
    const logger = makeLogger();
    const response = makeResponse();

    handleRouteError({
      error: new Error('generic'),
      logger: logger as unknown as Logger,
      response: response as any,
      message: 'msg',
    });

    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 500 }));
  });

  it('forwards statusCode from errors that carry one', () => {
    const logger = makeLogger();
    const response = makeResponse();
    const esError = Object.assign(new Error('not found'), { statusCode: 404 });

    handleRouteError({
      error: esError,
      logger: logger as unknown as Logger,
      response: response as any,
      message: 'msg',
    });

    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
  });

  it('returns statusCode 500 for non-Error values', () => {
    const logger = makeLogger();
    const response = makeResponse();

    handleRouteError({
      error: { code: 'ECONNREFUSED' },
      logger: logger as unknown as Logger,
      response: response as any,
      message: 'msg',
    });

    expect(response.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 500 }));
  });

  it('includes the message in the response body', () => {
    const logger = makeLogger();
    const response = makeResponse();

    handleRouteError({
      error: new Error('x'),
      logger: logger as unknown as Logger,
      response: response as any,
      message: 'Retrace failed',
    });

    expect(response.customError).toHaveBeenCalledWith(
      expect.objectContaining({ body: { message: 'Retrace failed' } })
    );
  });
});
