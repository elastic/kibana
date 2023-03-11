/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { IRuleTypeAlerts } from '../types';
import {
  createResourceInstallationHelper,
  errorResult,
  InitializationPromise,
  ResourceInstallationHelper,
  successResult,
} from './create_resource_installation_helper';
import { retryUntil } from './test_utils';

const logger: ReturnType<typeof loggingSystemMock['createLogger']> =
  loggingSystemMock.createLogger();

const initFn = async (context: IRuleTypeAlerts, timeoutMs?: number) => {
  logger.info(context.context);
};

const initFnWithError = async (context: IRuleTypeAlerts, timeoutMs?: number) => {
  throw new Error('no go');
};

const getCommonInitPromise = async (
  resolution: boolean,
  timeoutMs: number = 1
): Promise<InitializationPromise> => {
  if (timeoutMs < 0) {
    throw new Error('fail');
  }
  // delay resolution of promise by timeout value
  await new Promise((r) => setTimeout(r, timeoutMs));
  logger.info(`commonInitPromise resolved`);
  return Promise.resolve(resolution ? successResult() : errorResult(`error initializing`));
};

const getContextInitialized = async (
  helper: ResourceInstallationHelper,
  context: string = 'test1'
) => {
  const { result } = await helper.getInitializedContext(context);
  return result;
};

describe('createResourceInstallationHelper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test(`should wait for commonInitFunction to resolve before calling initFns for registered contexts`, async () => {
    const helper = createResourceInstallationHelper(
      logger,
      getCommonInitPromise(true, 100),
      initFn
    );

    // Add two contexts that need to be initialized
    helper.add({
      context: 'test1',
      mappings: { fieldMap: { field: { type: 'keyword', required: false } } },
    });
    helper.add({
      context: 'test2',
      mappings: { fieldMap: { field: { type: 'keyword', required: false } } },
    });

    await retryUntil('init fns run', async () => logger.info.mock.calls.length === 3);

    expect(logger.info).toHaveBeenNthCalledWith(1, `commonInitPromise resolved`);
    expect(logger.info).toHaveBeenNthCalledWith(2, 'test1');
    expect(logger.info).toHaveBeenNthCalledWith(3, 'test2');
    expect(await helper.getInitializedContext('test1')).toEqual({ result: true });
    expect(await helper.getInitializedContext('test2')).toEqual({ result: true });
  });

  test(`should return false if context is unrecognized`, async () => {
    const helper = createResourceInstallationHelper(
      logger,
      getCommonInitPromise(true, 100),
      initFn
    );

    helper.add({
      context: 'test1',
      mappings: { fieldMap: { field: { type: 'keyword', required: false } } },
    });

    await retryUntil('init fns run', async () => logger.info.mock.calls.length === 2);

    expect(await helper.getInitializedContext('test1')).toEqual({ result: true });
    expect(await helper.getInitializedContext('test2')).toEqual({
      result: false,
      error: `Unrecognized context test2`,
    });
  });

  test(`should log and return false if common init function returns false`, async () => {
    const helper = createResourceInstallationHelper(
      logger,
      getCommonInitPromise(false, 100),
      initFn
    );

    helper.add({
      context: 'test1',
      mappings: { fieldMap: { field: { type: 'keyword', required: false } } },
    });

    await retryUntil('common init fns run', async () => logger.info.mock.calls.length === 1);

    expect(logger.warn).toHaveBeenCalledWith(
      `Common resources were not initialized, cannot initialize context for test1`
    );
    expect(await helper.getInitializedContext('test1')).toEqual({
      result: false,
      error: `error initializing`,
    });
  });

  test(`should log and return false if common init function throws error`, async () => {
    const helper = createResourceInstallationHelper(logger, getCommonInitPromise(true, -1), initFn);

    helper.add({
      context: 'test1',
      mappings: { fieldMap: { field: { type: 'keyword', required: false } } },
    });

    await retryUntil(
      'common init fns run',
      async () => (await getContextInitialized(helper)) === false
    );

    expect(logger.error).toHaveBeenCalledWith(`Error initializing context test1 - fail`);
    expect(await helper.getInitializedContext('test1')).toEqual({
      result: false,
      error: `fail`,
    });
  });

  test(`should log and return false if context init function throws error`, async () => {
    const helper = createResourceInstallationHelper(
      logger,
      getCommonInitPromise(true, 100),
      initFnWithError
    );

    helper.add({
      context: 'test1',
      mappings: { fieldMap: { field: { type: 'keyword', required: false } } },
    });

    await retryUntil(
      'context init fns run',
      async () => (await getContextInitialized(helper)) === false
    );

    expect(logger.error).toHaveBeenCalledWith(`Error initializing context test1 - no go`);
    expect(await helper.getInitializedContext('test1')).toEqual({
      result: false,
      error: `no go`,
    });
  });
});
