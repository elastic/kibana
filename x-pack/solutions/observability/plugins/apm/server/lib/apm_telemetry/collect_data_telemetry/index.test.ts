/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { collectDataTelemetry } from '.';
import { tasks } from './tasks';

jest.mock('./tasks', () => ({
  tasks: [
    { name: 'first', executor: jest.fn() },
    { name: 'second', executor: jest.fn() },
  ],
}));

const [firstTask, secondTask] = tasks as Array<{ name: string; executor: jest.Mock }>;

describe('collectDataTelemetry', () => {
  function collect(signal: AbortSignal, logger = loggerMock.create()) {
    return collectDataTelemetry({
      indices: {} as any,
      telemetryClient: {} as any,
      savedObjectsClient: savedObjectsClientMock.create(),
      isProd: false,
      logger,
      signal,
    });
  }

  beforeEach(() => {
    jest.clearAllMocks();
    firstTask.executor.mockResolvedValue({});
    secondTask.executor.mockResolvedValue({});
  });

  it('skips all sub-tasks when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    const data = await collect(controller.signal);

    expect(firstTask.executor).not.toHaveBeenCalled();
    expect(secondTask.executor).not.toHaveBeenCalled();
    expect(data).toEqual({});
  });

  it('stops executing the chain once the signal aborts mid-run and does not report the abort as a failure', async () => {
    const controller = new AbortController();
    const logger = loggerMock.create();
    firstTask.executor.mockImplementation(async () => {
      controller.abort();
      throw new Error('Request aborted');
    });

    const data = await collect(controller.signal, logger);

    expect(firstTask.executor).toHaveBeenCalledTimes(1);
    expect(secondTask.executor).not.toHaveBeenCalled();
    expect(data).toEqual({});
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('runs all sub-tasks and merges their results when never aborted', async () => {
    const controller = new AbortController();
    firstTask.executor.mockResolvedValue({ foo: 1 });
    secondTask.executor.mockResolvedValue({ bar: 2 });

    const data = await collect(controller.signal);

    expect(data).toEqual(
      expect.objectContaining({
        foo: 1,
        bar: 2,
        tasks: expect.objectContaining({
          first: { took: { ms: expect.any(Number) } },
          second: { took: { ms: expect.any(Number) } },
        }),
      })
    );
  });
});
