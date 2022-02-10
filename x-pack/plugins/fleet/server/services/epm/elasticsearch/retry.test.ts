/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('timers/promises');
import { setTimeout } from 'timers/promises';

import { loggerMock } from '@kbn/logging-mocks';
import { errors as EsErrors } from '@elastic/elasticsearch';

import { retryTransientEsErrors } from './retry';

const setTimeoutMock = setTimeout as jest.Mock<
  ReturnType<typeof setTimeout>,
  Parameters<typeof setTimeout>
>;

describe('retryTransientErrors', () => {
  beforeEach(() => {
    setTimeoutMock.mockClear();
  });

  it("doesn't retry if operation is successful", async () => {
    const esCallMock = jest.fn().mockResolvedValue('success');
    expect(await retryTransientEsErrors(esCallMock)).toEqual('success');
    expect(esCallMock).toHaveBeenCalledTimes(1);
  });

  it('logs an warning message on retry', async () => {
    const logger = loggerMock.create();
    const esCallMock = jest
      .fn()
      .mockRejectedValueOnce(new EsErrors.ConnectionError('foo'))
      .mockResolvedValue('success');

    await retryTransientEsErrors(esCallMock, { logger });
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn.mock.calls[0][0]).toMatch(
      `Retrying Elasticsearch operation after [2s] due to error: ConnectionError: foo ConnectionError: foo`
    );
  });

  it('retries with an exponential backoff', async () => {
    let attempt = 0;
    const esCallMock = jest.fn(async () => {
      attempt++;
      if (attempt < 5) {
        throw new EsErrors.ConnectionError('foo');
      } else {
        return 'success';
      }
    });

    expect(await retryTransientEsErrors(esCallMock)).toEqual('success');
    expect(setTimeoutMock.mock.calls).toEqual([[2000], [4000], [8000], [16000]]);
    expect(esCallMock).toHaveBeenCalledTimes(5);
  });

  it('retries each supported error type', async () => {
    const errors = [
      new EsErrors.NoLivingConnectionsError('no living connection', {
        warnings: [],
        meta: {} as any,
      }),
      new EsErrors.ConnectionError('no connection'),
      new EsErrors.TimeoutError('timeout'),
      new EsErrors.ResponseError({ statusCode: 503, meta: {} as any, warnings: [] }),
      new EsErrors.ResponseError({ statusCode: 408, meta: {} as any, warnings: [] }),
      new EsErrors.ResponseError({ statusCode: 410, meta: {} as any, warnings: [] }),
    ];

    for (const error of errors) {
      const esCallMock = jest.fn().mockRejectedValueOnce(error).mockResolvedValue('success');
      expect(await retryTransientEsErrors(esCallMock)).toEqual('success');
      expect(esCallMock).toHaveBeenCalledTimes(2);
    }
  });

  it('does not retry unsupported errors', async () => {
    const error = new Error('foo!');
    const esCallMock = jest.fn().mockRejectedValueOnce(error).mockResolvedValue('success');
    await expect(retryTransientEsErrors(esCallMock)).rejects.toThrow(error);
    expect(esCallMock).toHaveBeenCalledTimes(1);
  });
});
