/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { IRuleTypeAlerts } from '../types';
import { createResourceInstallationHelper } from './create_resource_installation_helper';

const TEST_CONTEXT_RETRY_DELAY_MS = 1;
const commonInitPromise: Promise<void> = Promise.resolve();

const logger: ReturnType<typeof loggingSystemMock['createLogger']> =
  loggingSystemMock.createLogger();

const initFn = async (context: IRuleTypeAlerts, timeoutMs?: number) => {
  logger.info(context.context);
};

const initFnWithDelay = async (context: IRuleTypeAlerts, timeoutMs?: number) => {
  logger.info(context.context);
  await new Promise((r) => setTimeout(r, 50));
};

const initFnWithError = async (context: IRuleTypeAlerts, timeoutMs?: number) => {
  throw new Error('fail');
};

describe('createResourceInstallationHelper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test(`should not call init function if readyToInitialize is false`, async () => {
    const helper = createResourceInstallationHelper(logger, initFn);

    // Add two contexts that need to be initialized but don't call helper.setReadyToInitialize()
    helper.add({
      context: 'test1',
      mappings: { fieldMap: { field: { type: 'keyword', required: false } } },
    });
    helper.add({
      context: 'test2',
      mappings: { fieldMap: { field: { type: 'keyword', required: false } } },
    });

    expect(logger.info).not.toHaveBeenCalled();
    expect(
      await helper.getInitializedContext(commonInitPromise, 'test1', TEST_CONTEXT_RETRY_DELAY_MS)
    ).toBe(false);
    expect(
      await helper.getInitializedContext(commonInitPromise, 'test2', TEST_CONTEXT_RETRY_DELAY_MS)
    ).toBe(false);
  });

  test(`should call init function if readyToInitialize is set to true`, async () => {
    const helper = createResourceInstallationHelper(logger, initFn);

    // Add two contexts that need to be initialized and then call helper.setReadyToInitialize()
    helper.add({
      context: 'test1',
      mappings: { fieldMap: { field: { type: 'keyword', required: false } } },
    });
    helper.add({
      context: 'test2',
      mappings: { fieldMap: { field: { type: 'keyword', required: false } } },
    });

    helper.setReadyToInitialize();

    // for the setImmediate
    await new Promise((r) => setTimeout(r, 10));

    expect(logger.info).toHaveBeenCalledTimes(2);
    expect(
      await helper.getInitializedContext(commonInitPromise, 'test1', TEST_CONTEXT_RETRY_DELAY_MS)
    ).toBe(true);
    expect(
      await helper.getInitializedContext(commonInitPromise, 'test2', TEST_CONTEXT_RETRY_DELAY_MS)
    ).toBe(true);
  });

  test(`should install resources for contexts added after readyToInitialize is called`, async () => {
    const helper = createResourceInstallationHelper(logger, initFnWithDelay);

    // Add two contexts that need to be initialized
    helper.add({
      context: 'test1',
      mappings: { fieldMap: { field: { type: 'keyword', required: false } } },
    });
    helper.add({
      context: 'test2',
      mappings: { fieldMap: { field: { type: 'keyword', required: false } } },
    });

    // Start processing the queued contexts
    helper.setReadyToInitialize();

    // for the setImmediate
    await new Promise((r) => setTimeout(r, 10));

    // Add another context to process
    helper.add({
      context: 'test3',
      mappings: { fieldMap: { field: { type: 'keyword', required: false } } },
    });

    // 3 contexts with delay will take 150
    await new Promise((r) => setTimeout(r, 10));

    expect(logger.info).toHaveBeenCalledTimes(3);
    expect(
      await helper.getInitializedContext(commonInitPromise, 'test1', TEST_CONTEXT_RETRY_DELAY_MS)
    ).toBe(true);
    expect(
      await helper.getInitializedContext(commonInitPromise, 'test2', TEST_CONTEXT_RETRY_DELAY_MS)
    ).toBe(true);
    expect(
      await helper.getInitializedContext(commonInitPromise, 'test3', TEST_CONTEXT_RETRY_DELAY_MS)
    ).toBe(true);
  });

  test(`should install resources for contexts added after initial processing loop has run`, async () => {
    const helper = createResourceInstallationHelper(logger, initFn);

    // No contexts queued so this should finish quickly
    helper.setReadyToInitialize();

    // for the setImmediate
    await new Promise((r) => setTimeout(r, 10));

    expect(logger.info).not.toHaveBeenCalled();

    // Add a context to process
    helper.add({
      context: 'test1',
      mappings: { fieldMap: { field: { type: 'keyword', required: false } } },
    });

    // for the setImmediate
    await new Promise((r) => setTimeout(r, 10));

    expect(logger.info).toHaveBeenCalledTimes(1);
    expect(
      await helper.getInitializedContext(commonInitPromise, 'test1', TEST_CONTEXT_RETRY_DELAY_MS)
    ).toBe(true);
  });

  test(`should gracefully handle errors during initialization and set initialized flag to false`, async () => {
    const helper = createResourceInstallationHelper(logger, initFnWithError);

    helper.setReadyToInitialize();

    // for the setImmediate
    await new Promise((r) => setTimeout(r, 10));

    // Add a context to process
    helper.add({
      context: 'test1',
      mappings: { fieldMap: { field: { type: 'keyword', required: false } } },
    });

    // for the setImmediate
    await new Promise((r) => setTimeout(r, 10));

    expect(logger.error).toHaveBeenCalledWith(`Error initializing context test1 - fail`);
    expect(
      await helper.getInitializedContext(commonInitPromise, 'test1', TEST_CONTEXT_RETRY_DELAY_MS)
    ).toBe(false);
  });

  test(`should correctly return context initialized = false for invalid context`, async () => {
    const helper = createResourceInstallationHelper(logger, initFn);

    // Add two contexts that need to be initialized but don't call helper.setReadyToInitialize()
    helper.add({
      context: 'test1',
      mappings: { fieldMap: { field: { type: 'keyword', required: false } } },
    });
    helper.add({
      context: 'test2',
      mappings: { fieldMap: { field: { type: 'keyword', required: false } } },
    });

    helper.setReadyToInitialize();

    // for the setImmediate
    await new Promise((r) => setTimeout(r, 10));

    expect(logger.info).toHaveBeenCalledTimes(2);
    expect(
      await helper.getInitializedContext(commonInitPromise, 'invalid', TEST_CONTEXT_RETRY_DELAY_MS)
    ).toBe(false);
  });

  test(`should correctly return context initialized = true when context requested before initialization has started`, async () => {
    const helper = createResourceInstallationHelper(logger, initFn);

    // Add two contexts that need to be initialized but don't call helper.setReadyToInitialize()
    helper.add({
      context: 'test1',
      mappings: { fieldMap: { field: { type: 'keyword', required: false } } },
    });
    helper.add({
      context: 'test2',
      mappings: { fieldMap: { field: { type: 'keyword', required: false } } },
    });

    // delay kicking off context specific initialization
    setTimeout(() => {
      helper.setReadyToInitialize();
    }, 10);

    expect(
      await helper.getInitializedContext(commonInitPromise, 'test1', TEST_CONTEXT_RETRY_DELAY_MS)
    ).toBe(true);
    expect(
      await helper.getInitializedContext(commonInitPromise, 'test2', TEST_CONTEXT_RETRY_DELAY_MS)
    ).toBe(true);

    expect(logger.debug).toHaveBeenCalledWith(
      `Delaying and retrying getInitializedContext for context test1 - try # 1`
    );
    expect(logger.debug).toHaveBeenCalledWith(
      `Delaying and retrying getInitializedContext for context test1 - try # 2`
    );
  });
});
