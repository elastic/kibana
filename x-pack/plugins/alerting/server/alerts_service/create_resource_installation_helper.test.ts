/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { IRuleTypeAlerts } from '../types';
import { createResourceInstallationHelper } from './create_resource_installation_helper';

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

  test(`should not call init function if readyToInitialize is false`, () => {
    const initializedContexts: Map<string, Promise<boolean>> = new Map();
    const helper = createResourceInstallationHelper(initializedContexts, initFn);

    // Add two contexts that need to be initialized but don't call helper.setReadyToInitialize()
    helper.add({ context: 'test1', fieldMap: { field: { type: 'keyword', required: false } } });
    helper.add({ context: 'test2', fieldMap: { field: { type: 'keyword', required: false } } });

    expect(logger.info).not.toHaveBeenCalled();
    expect([...initializedContexts.keys()].length).toEqual(0);
  });

  test(`should call init function if readyToInitialize is set to true`, async () => {
    const initializedContexts: Map<string, Promise<boolean>> = new Map();
    const helper = createResourceInstallationHelper(initializedContexts, initFn);

    // Add two contexts that need to be initialized and then call helper.setReadyToInitialize()
    helper.add({ context: 'test1', fieldMap: { field: { type: 'keyword', required: false } } });
    helper.add({ context: 'test2', fieldMap: { field: { type: 'keyword', required: false } } });

    helper.setReadyToInitialize();

    // for the setImmediate
    await new Promise((r) => setTimeout(r, 10));

    expect(logger.info).toHaveBeenCalledTimes(2);
    expect([...initializedContexts.keys()].length).toEqual(2);

    expect(await initializedContexts.get('test1')).toEqual(true);
    expect(await initializedContexts.get('test2')).toEqual(true);
  });

  test(`should install resources for contexts added after readyToInitialize is called`, async () => {
    const initializedContexts: Map<string, Promise<boolean>> = new Map();
    const helper = createResourceInstallationHelper(initializedContexts, initFnWithDelay);

    // Add two contexts that need to be initialized
    helper.add({ context: 'test1', fieldMap: { field: { type: 'keyword', required: false } } });
    helper.add({ context: 'test2', fieldMap: { field: { type: 'keyword', required: false } } });

    // Start processing the queued contexts
    helper.setReadyToInitialize();

    // for the setImmediate
    await new Promise((r) => setTimeout(r, 10));

    // Add another context to process
    helper.add({ context: 'test3', fieldMap: { field: { type: 'keyword', required: false } } });

    // 3 contexts with delay will take 150
    await new Promise((r) => setTimeout(r, 10));

    expect(logger.info).toHaveBeenCalledTimes(3);
    expect([...initializedContexts.keys()].length).toEqual(3);

    expect(await initializedContexts.get('test1')).toEqual(true);
    expect(await initializedContexts.get('test2')).toEqual(true);
    expect(await initializedContexts.get('test3')).toEqual(true);
  });

  test(`should install resources for contexts added after initial processing loop has run`, async () => {
    const initializedContexts: Map<string, Promise<boolean>> = new Map();
    const helper = createResourceInstallationHelper(initializedContexts, initFn);

    // No contexts queued so this should finish quickly
    helper.setReadyToInitialize();

    // for the setImmediate
    await new Promise((r) => setTimeout(r, 10));

    expect(logger.info).not.toHaveBeenCalled();
    expect([...initializedContexts.keys()].length).toEqual(0);

    // Add a context to process
    helper.add({ context: 'test1', fieldMap: { field: { type: 'keyword', required: false } } });

    // for the setImmediate
    await new Promise((r) => setTimeout(r, 10));

    expect(logger.info).toHaveBeenCalledTimes(1);
    expect([...initializedContexts.keys()].length).toEqual(1);

    expect(await initializedContexts.get('test1')).toEqual(true);
  });

  test(`should gracefully handle errors during initialization and set initialized flag to false`, async () => {
    const initializedContexts: Map<string, Promise<boolean>> = new Map();
    const helper = createResourceInstallationHelper(initializedContexts, initFnWithError);

    helper.setReadyToInitialize();

    // for the setImmediate
    await new Promise((r) => setTimeout(r, 10));

    // Add a context to process
    helper.add({ context: 'test1', fieldMap: { field: { type: 'keyword', required: false } } });

    // for the setImmediate
    await new Promise((r) => setTimeout(r, 10));

    expect([...initializedContexts.keys()].length).toEqual(1);
    expect(await initializedContexts.get('test1')).toEqual(false);
  });
});
