/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, CoreStart } from 'src/core/server';
import { coreMock } from 'src/core/server/mocks';
import { IEventLogService } from './index';
import { Plugin } from './plugin';
import { spacesMock } from '../../spaces/server/mocks';

describe('event_log plugin', () => {
  it('can setup and start', async () => {
    const initializerContext = coreMock.createPluginInitializerContext({});
    const coreSetup = coreMock.createSetup() as CoreSetup<IEventLogService>;
    const coreStart = coreMock.createStart() as CoreStart;

    const plugin = new Plugin(initializerContext);
    const spaces = spacesMock.createSetup();
    const setup = await plugin.setup(coreSetup, { spaces });
    expect(typeof setup.getLogger).toBe('function');
    expect(typeof setup.getProviderActions).toBe('function');
    expect(typeof setup.isEnabled).toBe('function');
    expect(typeof setup.isIndexingEntries).toBe('function');
    expect(typeof setup.isLoggingEntries).toBe('function');
    expect(typeof setup.isProviderActionRegistered).toBe('function');
    expect(typeof setup.registerProviderActions).toBe('function');
    expect(typeof setup.registerSavedObjectProvider).toBe('function');

    const start = await plugin.start(coreStart);
    expect(typeof start.getClient).toBe('function');
  });

  it('can stop', async () => {
    const initializerContext = coreMock.createPluginInitializerContext({});
    const mockLogger = initializerContext.logger.get();
    const coreSetup = coreMock.createSetup() as CoreSetup<IEventLogService>;
    const coreStart = coreMock.createStart() as CoreStart;

    const plugin = new Plugin(initializerContext);
    const spaces = spacesMock.createSetup();
    await plugin.setup(coreSetup, { spaces });
    await plugin.start(coreStart);
    await plugin.stop();
    expect(mockLogger.info).toBeCalledWith('shutdown: waiting to finish');
    expect(mockLogger.info).toBeCalledWith('shutdown: finished');
  });
});
