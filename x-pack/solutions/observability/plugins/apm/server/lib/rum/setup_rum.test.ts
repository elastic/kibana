/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  coreMock,
  httpServerMock,
  httpServiceMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { setupRum } from './setup_rum';

describe('setupRum', () => {
  let stop: (() => void) | undefined;

  afterEach(() => {
    stop?.();
    jest.useRealTimers();
  });

  const setup = (enabled: boolean) => {
    const core = coreMock.createSetup();
    const coreStart = coreMock.createStart();
    const router = httpServiceMock.createRouter();
    const taskStart = taskManagerMock.createStart();
    const logger = loggingSystemMock.createLogger();
    const agentless = { mintToken: jest.fn(), publish: jest.fn() };

    core.http.createRouter.mockReturnValue(router);
    core.getStartServices.mockResolvedValue([
      coreStart,
      { fleet: { agentless: { createRumClient: () => agentless } }, taskManager: taskStart },
      {},
    ]);
    return {
      router,
      logger,
      taskStart,
      start: () => {
        stop = setupRum(core, taskManagerMock.createSetup(), enabled, logger);
      },
    };
  };

  it('keeps routes and scheduling disabled by default', () => {
    const { router, taskStart, start } = setup(false);
    start();

    expect(router.get).not.toHaveBeenCalled();
    expect(router.put).not.toHaveBeenCalled();
    expect(taskStart.ensureScheduled).not.toHaveBeenCalled();
  });

  it('blocks writes if recovery scheduling fails and retries scheduling on the next request', async () => {
    const { router, taskStart, start } = setup(true);
    const settings = { enabled: true, allowed_origins: ['https://example.org'] };
    taskStart.ensureScheduled.mockRejectedValueOnce(new Error('Task Manager unavailable'));
    start();

    const [, writeSettings] = router.put.mock.calls[0];
    const request = httpServerMock.createKibanaRequest({ body: settings });
    const response = httpServerMock.createResponseFactory();
    // The router mock delegates the handler without translating Boom errors.
    expect(router.handleLegacyErrors).toHaveBeenCalledWith(writeSettings);
    await expect(
      writeSettings(coreMock.createRequestHandlerContext(), request, response)
    ).rejects.toMatchObject({
      output: { statusCode: 503 },
    });
    expect(response.ok).not.toHaveBeenCalled();

    const [, readSettings] = router.get.mock.calls[0];
    await readSettings(
      coreMock.createRequestHandlerContext(),
      httpServerMock.createKibanaRequest(),
      response
    );
    expect(taskStart.ensureScheduled).toHaveBeenCalledTimes(2);
    expect(response.ok).toHaveBeenCalled();
  });

  it('retries a startup scheduling failure even when there is no request', async () => {
    jest.useFakeTimers();
    const { router, taskStart, start } = setup(true);
    taskStart.ensureScheduled.mockRejectedValueOnce(new Error('Task Manager unavailable'));
    start();

    await jest.advanceTimersByTimeAsync(0);
    expect(taskStart.ensureScheduled).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(60_000);
    expect(taskStart.ensureScheduled).toHaveBeenCalledTimes(2);
    expect(router.get).toHaveBeenCalledTimes(1);
  });
});
