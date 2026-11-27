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
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';
import type { RequestHandler } from '@kbn/core/server';
import type { AgentlessRumPolicy } from '@kbn/fleet-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type { RunContext } from '@kbn/task-manager-plugin/server';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { RUM_POLICY_TYPE } from './rum_policy_service';
import { setupRum } from './setup_rum';

const TASK_TYPE = 'apm:republish_rum_policy';

const policy: AgentlessRumPolicy = {
  revision: 1,
  enabled: true,
  deleted: false,
  allowed_origins: ['https://example.org'],
  client_tokens: [],
};

describe('setupRum', () => {
  let stop: (() => void) | undefined;

  afterEach(() => {
    stop?.();
    jest.useRealTimers();
  });

  const setup = (
    enabled: boolean,
    { hasAllRequested = true, configured = true, spaceId = 'default' } = {}
  ) => {
    const core = coreMock.createSetup();
    const coreStart = coreMock.createStart();
    const router = httpServiceMock.createRouter();
    const taskSetup = taskManagerMock.createSetup();
    const taskStart = taskManagerMock.createStart();
    const logger = loggingSystemMock.createLogger();
    const agentless = {
      isConfigured: jest.fn(() => configured),
      mintToken: jest.fn(),
      publish: jest.fn(),
    };
    const savedObjects = savedObjectsClientMock.create();
    const globally = jest.fn().mockResolvedValue({ hasAllRequested });
    const authz = {
      mode: { useRbacForRequest: () => true },
      actions: { api: { get: (operation: string) => `api:${operation}` } },
      checkPrivilegesWithRequest: jest.fn(() => ({ globally })),
    } as unknown as SecurityPluginStart['authz'];

    savedObjects.get.mockResolvedValue({
      type: RUM_POLICY_TYPE,
      id: 'default',
      attributes: policy,
      references: [],
      version: 'version-1',
    });
    coreStart.savedObjects.getUnsafeInternalClient.mockReturnValue(savedObjects);
    core.http.createRouter.mockReturnValue(router);
    core.getStartServices.mockResolvedValue([
      coreStart,
      {
        fleet: { agentless: { createRumClient: () => agentless } },
        taskManager: taskStart,
        security: { authz },
        spaces: { spacesService: { getSpaceId: () => spaceId } },
      },
      {},
    ]);

    const runTask = (signal = new AbortController().signal) => {
      const [[definitions]] = taskSetup.registerTaskDefinitions.mock.calls;
      return definitions[TASK_TYPE]
        .createTaskRunner({
          taskInstance: {},
          signal,
        } as unknown as RunContext)
        .run();
    };

    const callRoute = async (handler: RequestHandler, params = {}, body = {}) => {
      const response = httpServerMock.createResponseFactory();
      await handler(
        coreMock.createCustomRequestHandlerContext(coreMock.createRequestHandlerContext()),
        httpServerMock.createKibanaRequest({ params, body }),
        response
      );
      return response;
    };

    return {
      router,
      logger,
      taskSetup,
      taskStart,
      agentless,
      savedObjects,
      globally,
      runTask,
      callRoute,
      start: () => {
        stop = setupRum(core, taskSetup, enabled, logger);
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

  describe('authorization', () => {
    it('rejects every write without APM settings write access in all spaces', async () => {
      const { router, taskStart, savedObjects, agentless, globally, callRoute, start } = setup(
        true,
        { hasAllRequested: false }
      );
      start();
      // Let the startup scheduling settle before checking that requests do not schedule.
      await new Promise(process.nextTick);
      taskStart.ensureScheduled.mockClear();
      savedObjects.get.mockClear();

      const writes = [
        router.put.mock.calls[0][1],
        router.post.mock.calls[0][1],
        ...router.delete.mock.calls.map(([, handler]) => handler),
      ];
      expect(writes).toHaveLength(4);
      for (const handler of writes) {
        await expect(callRoute(handler, { id: 'rum_client' }, policy)).rejects.toMatchObject({
          output: { statusCode: 403 },
        });
      }
      expect(globally).toHaveBeenCalledTimes(4);
      expect(globally).toHaveBeenCalledWith({ kibana: ['api:apm', 'api:apm_settings_write'] });
      expect(taskStart.ensureScheduled).not.toHaveBeenCalled();
      expect(savedObjects.get).not.toHaveBeenCalled();
      expect(agentless.mintToken).not.toHaveBeenCalled();
      expect(agentless.publish).not.toHaveBeenCalled();
    });

    it('rejects every route outside the default space', async () => {
      const { router, savedObjects, agentless, globally, callRoute, start } = setup(true, {
        spaceId: 'other',
      });
      start();

      const handlers = [
        router.get.mock.calls[0][1],
        router.put.mock.calls[0][1],
        router.post.mock.calls[0][1],
        ...router.delete.mock.calls.map(([, handler]) => handler),
      ];
      expect(handlers).toHaveLength(5);
      for (const handler of handlers) {
        await expect(callRoute(handler, { id: 'rum_client' }, policy)).rejects.toMatchObject({
          output: { statusCode: 403 },
        });
      }
      expect(globally).not.toHaveBeenCalled();
      expect(savedObjects.get).not.toHaveBeenCalled();
      expect(agentless.mintToken).not.toHaveBeenCalled();
      expect(agentless.publish).not.toHaveBeenCalled();
    });

    it('allows reads without the global write check', async () => {
      const { router, globally, callRoute, start } = setup(true, { hasAllRequested: false });
      start();

      const response = await callRoute(router.get.mock.calls[0][1]);
      expect(response.ok).toHaveBeenCalled();
      expect(globally).not.toHaveBeenCalled();
    });

    it('allows writes with APM settings write access in all spaces', async () => {
      const { router, agentless, callRoute, start } = setup(true);
      start();

      const response = await callRoute(
        router.put.mock.calls[0][1],
        {},
        {
          enabled: true,
          allowed_origins: ['https://example.org'],
        }
      );
      expect(response.ok).toHaveBeenCalledWith({ body: { published: true } });
      expect(agentless.publish).toHaveBeenCalled();
    });
  });

  describe('recovery task', () => {
    it('republishes the latest saved policy', async () => {
      const { agentless, runTask, start } = setup(true);
      start();
      const { signal } = new AbortController();

      await runTask(signal);
      expect(agentless.publish).toHaveBeenCalledWith(policy, { signal });
    });

    it('fails so Task Manager retries when publishing fails', async () => {
      const { agentless, runTask, start } = setup(true);
      agentless.publish.mockRejectedValue(new Error('Agentless unavailable'));
      start();

      await expect(runTask()).rejects.toThrow('Could not republish the RUM policy');
    });

    it('does not publish once the task is cancelled', async () => {
      const { agentless, savedObjects, runTask, start } = setup(true);
      const controller = new AbortController();
      savedObjects.get.mockImplementation(async () => {
        controller.abort();
        return { type: RUM_POLICY_TYPE, id: 'default', attributes: policy, references: [] };
      });
      start();

      await expect(runTask(controller.signal)).resolves.toBeUndefined();
      expect(agentless.publish).not.toHaveBeenCalled();
    });

    it.each([
      ['Managed RUM is disabled', false, true],
      ['the Agentless API is not configured', true, false],
    ])('is registered and does nothing when %s', async (_, enabled, configured) => {
      const { agentless, taskSetup, runTask, start } = setup(enabled, { configured });
      start();

      expect(taskSetup.registerTaskDefinitions).toHaveBeenCalledWith({
        [TASK_TYPE]: expect.objectContaining({ timeout: '30s' }),
      });
      await expect(runTask()).resolves.toBeUndefined();
      expect(agentless.publish).not.toHaveBeenCalled();
    });

    it('applies an Agentless config that is added after startup', async () => {
      const { agentless, router, callRoute, runTask, start } = setup(true, { configured: false });
      start();

      await expect(callRoute(router.get.mock.calls[0][1])).rejects.toMatchObject({
        output: { statusCode: 503 },
      });
      agentless.isConfigured.mockReturnValue(true);
      expect((await callRoute(router.get.mock.calls[0][1])).ok).toHaveBeenCalled();
      await runTask();
      expect(agentless.publish).toHaveBeenCalled();
    });
  });
});
