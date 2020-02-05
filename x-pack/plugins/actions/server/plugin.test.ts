/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionsPlugin } from './plugin';
import { coreMock } from '../../../../src/core/server/mocks';
import { licensingMock } from '../../licensing/server/mocks';
import { encryptedSavedObjectsMock } from '../../encrypted_saved_objects/server/mocks';

/**
 * HACK: These tests were put together to ensuire the routeHandlerContext and the function
 * "getActionsClientWithRequest" throws when needed. There's a lot of blockers for writing
 * a proper test like misisng plugin start/setup mocks for taskManager and event log.
 * This test contains what is needed to get to the necessary function within setup() and start().
 */
describe('Actions Plugin', () => {
  describe('setup()', () => {
    describe('routeHandlerContext.getActionsClient()', () => {
      it('should not throw error when ESO plugin not using a generated key', async () => {
        const context = coreMock.createPluginInitializerContext();
        const plugin = new ActionsPlugin(context);

        const coreSetup = coreMock.createSetup();
        await plugin.setup(coreSetup, {
          taskManager: {
            registerTaskDefinitions: jest.fn(),
          } as any,
          encryptedSavedObjects: {
            ...encryptedSavedObjectsMock.createSetup(),
            usingEphemeralEncryptionKey: false,
          },
          licensing: licensingMock.createSetup(),
          event_log: {
            getLogger: jest.fn(),
            registerProviderActions: jest.fn(),
          } as any,
        });

        expect(coreSetup.http.registerRouteHandlerContext).toHaveBeenCalledTimes(1);
        const handler = coreSetup.http.registerRouteHandlerContext.mock.calls[0];
        expect(handler[0]).toEqual('actions');

        const actionsContextHandler = await (handler[1](
          {
            core: coreMock.createStart(),
          } as any,
          {} as any,
          {} as any
        ) as any)!;
        actionsContextHandler.getActionsClient();
      });

      it('should throw error when ESO plugin using a generated key', async () => {
        const context = coreMock.createPluginInitializerContext();
        const plugin = new ActionsPlugin(context);

        const coreSetup = coreMock.createSetup();
        await plugin.setup(coreSetup, {
          taskManager: {
            registerTaskDefinitions: jest.fn(),
          } as any,
          encryptedSavedObjects: encryptedSavedObjectsMock.createSetup(),
          licensing: licensingMock.createSetup(),
          event_log: {
            getLogger: jest.fn(),
            registerProviderActions: jest.fn(),
          } as any,
        });

        expect(coreSetup.http.registerRouteHandlerContext).toHaveBeenCalledTimes(1);
        const handler = coreSetup.http.registerRouteHandlerContext.mock.calls[0];
        expect(handler[0]).toEqual('actions');

        const actionsContextHandler = await (handler[1]({} as any, {} as any, {} as any) as any)!;
        expect(() => actionsContextHandler.getActionsClient()).toThrowErrorMatchingInlineSnapshot(
          `"Unable to create actions client due to the Encrypted Saved Objects plugin using an ephemeral encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in kibana.yml"`
        );
      });
    });
  });
  describe('start()', () => {
    describe('getActionsClientWithRequest()', () => {
      it('should not throw error when ESO plugin not using a generated key', async () => {
        const context = coreMock.createPluginInitializerContext();
        const plugin = new ActionsPlugin(context);

        await plugin.setup(coreMock.createSetup(), {
          taskManager: {
            registerTaskDefinitions: jest.fn(),
          } as any,
          encryptedSavedObjects: {
            ...encryptedSavedObjectsMock.createSetup(),
            usingEphemeralEncryptionKey: false,
          },
          licensing: licensingMock.createSetup(),
          event_log: {
            getLogger: jest.fn(),
            registerProviderActions: jest.fn(),
          } as any,
        });

        const pluginStart = plugin.start(coreMock.createStart(), {
          taskManager: {} as any,
          encryptedSavedObjects: encryptedSavedObjectsMock.createStart(),
        });

        await pluginStart.getActionsClientWithRequest({} as any);
      });

      it('should throw error when ESO plugin using generated key', async () => {
        const context = coreMock.createPluginInitializerContext();
        const plugin = new ActionsPlugin(context);

        const esoPluginSetup = encryptedSavedObjectsMock.createSetup();
        await plugin.setup(coreMock.createSetup(), {
          taskManager: {
            registerTaskDefinitions: jest.fn(),
          } as any,
          encryptedSavedObjects: esoPluginSetup,
          licensing: licensingMock.createSetup(),
          event_log: {
            getLogger: jest.fn(),
            registerProviderActions: jest.fn(),
          } as any,
        });

        const pluginStart = plugin.start(coreMock.createStart(), {
          taskManager: {} as any,
          encryptedSavedObjects: encryptedSavedObjectsMock.createStart(),
        });

        expect(esoPluginSetup.usingEphemeralEncryptionKey).toEqual(true);
        await expect(
          pluginStart.getActionsClientWithRequest({} as any)
        ).rejects.toThrowErrorMatchingInlineSnapshot(
          `"Unable to create actions client due to the Encrypted Saved Objects plugin using an ephemeral encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in kibana.yml"`
        );
      });
    });
  });
});
