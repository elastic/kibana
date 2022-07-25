/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart } from '@kbn/core/server';
import { coreMock } from '@kbn/core/server/mocks';
import { IEventLogService } from '.';
import { Plugin } from './plugin';
import { spacesMock } from '@kbn/spaces-plugin/server/mocks';

describe('event_log plugin', () => {
  it('can setup and start', () => {
    const initializerContext = coreMock.createPluginInitializerContext({});
    const coreSetup = coreMock.createSetup() as CoreSetup<IEventLogService>;
    const coreStart = coreMock.createStart() as CoreStart;

    const plugin = new Plugin(initializerContext);
    const setup = plugin.setup(coreSetup);
    expect(typeof setup.getLogger).toBe('function');
    expect(typeof setup.getProviderActions).toBe('function');
    expect(typeof setup.isIndexingEntries).toBe('function');
    expect(typeof setup.isLoggingEntries).toBe('function');
    expect(typeof setup.isProviderActionRegistered).toBe('function');
    expect(typeof setup.registerProviderActions).toBe('function');
    expect(typeof setup.registerSavedObjectProvider).toBe('function');

    const spaces = spacesMock.createStart();
    const start = plugin.start(coreStart, { spaces });
    expect(typeof start.getClient).toBe('function');
  });

  it('can stop', async () => {
    const initializerContext = coreMock.createPluginInitializerContext({});
    const mockLogger = initializerContext.logger.get();
    const coreSetup = coreMock.createSetup() as CoreSetup<IEventLogService>;
    const coreStart = coreMock.createStart() as CoreStart;

    const plugin = new Plugin(initializerContext);
    const spaces = spacesMock.createStart();
    plugin.setup(coreSetup);
    plugin.start(coreStart, { spaces });
    await plugin.stop();
    expect(mockLogger.debug).toBeCalledWith('shutdown: waiting to finish');
    expect(mockLogger.debug).toBeCalledWith('shutdown: finished');
  });
});
