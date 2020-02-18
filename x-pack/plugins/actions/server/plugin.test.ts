/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionsPlugin, ActionsPluginsSetup, ActionsPluginsStart } from './plugin';
import { PluginInitializerContext } from '../../../../src/core/server';
import { coreMock, httpServerMock } from '../../../../src/core/server/mocks';
import { licensingMock } from '../../licensing/server/mocks';
import { encryptedSavedObjectsMock } from '../../encrypted_saved_objects/server/mocks';
import { taskManagerMock } from '../../task_manager/server/mocks';
import { eventLogMock } from '../../event_log/server/mocks';

describe('Actions Plugin', () => {
  describe('setup()', () => {
    let context: PluginInitializerContext;
    let plugin: ActionsPlugin;
    let coreSetup: ReturnType<typeof coreMock.createSetup>;
    let pluginsSetup: jest.Mocked<ActionsPluginsSetup>;

    beforeEach(() => {
      context = coreMock.createPluginInitializerContext();
      plugin = new ActionsPlugin(context);
      coreSetup = coreMock.createSetup();
      pluginsSetup = {
        taskManager: taskManagerMock.createSetup(),
        encryptedSavedObjects: encryptedSavedObjectsMock.createSetup(),
        licensing: licensingMock.createSetup(),
        eventLog: eventLogMock.createSetup(),
      };
    });

    it('should log warning when Encrypted Saved Objects plugin is using an ephemeral encryption key', async () => {
      await plugin.setup(coreSetup, pluginsSetup);
      expect(pluginsSetup.encryptedSavedObjects.usingEphemeralEncryptionKey).toEqual(true);
      expect(context.logger.get().warn).toHaveBeenCalledWith(
        'APIs are disabled due to the Encrypted Saved Objects plugin using an ephemeral encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in kibana.yml.'
      );
    });

    describe('routeHandlerContext.getActionsClient()', () => {
      it('should not throw error when ESO plugin not using a generated key', async () => {
        await plugin.setup(coreSetup, {
          ...pluginsSetup,
          encryptedSavedObjects: {
            ...pluginsSetup.encryptedSavedObjects,
            usingEphemeralEncryptionKey: false,
          },
        });

        expect(coreSetup.http.registerRouteHandlerContext).toHaveBeenCalledTimes(1);
        const handler = coreSetup.http.registerRouteHandlerContext.mock.calls[0];
        expect(handler[0]).toEqual('actions');

        const actionsContextHandler = (await handler[1](
          {
            core: {
              savedObjects: {
                client: {},
              },
            },
          } as any,
          httpServerMock.createKibanaRequest(),
          httpServerMock.createResponseFactory()
        )) as any;
        actionsContextHandler.getActionsClient();
      });

      it('should throw error when ESO plugin using a generated key', async () => {
        await plugin.setup(coreSetup, pluginsSetup);

        expect(coreSetup.http.registerRouteHandlerContext).toHaveBeenCalledTimes(1);
        const handler = coreSetup.http.registerRouteHandlerContext.mock.calls[0];
        expect(handler[0]).toEqual('actions');

        const actionsContextHandler = (await handler[1](
          {
            core: {
              savedObjects: {
                client: {},
              },
            },
          } as any,
          httpServerMock.createKibanaRequest(),
          httpServerMock.createResponseFactory()
        )) as any;
        expect(() => actionsContextHandler.getActionsClient()).toThrowErrorMatchingInlineSnapshot(
          `"Unable to create actions client due to the Encrypted Saved Objects plugin using an ephemeral encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in kibana.yml"`
        );
      });
    });
  });
  describe('start()', () => {
    let plugin: ActionsPlugin;
    let coreSetup: ReturnType<typeof coreMock.createSetup>;
    let coreStart: ReturnType<typeof coreMock.createStart>;
    let pluginsSetup: jest.Mocked<ActionsPluginsSetup>;
    let pluginsStart: jest.Mocked<ActionsPluginsStart>;

    beforeEach(() => {
      const context = coreMock.createPluginInitializerContext();
      plugin = new ActionsPlugin(context);
      coreSetup = coreMock.createSetup();
      coreStart = coreMock.createStart();
      pluginsSetup = {
        taskManager: taskManagerMock.createSetup(),
        encryptedSavedObjects: encryptedSavedObjectsMock.createSetup(),
        licensing: licensingMock.createSetup(),
        eventLog: eventLogMock.createSetup(),
      };
      pluginsStart = {
        taskManager: taskManagerMock.createStart(),
        encryptedSavedObjects: encryptedSavedObjectsMock.createStart(),
      };
    });

    describe('getActionsClientWithRequest()', () => {
      it('should not throw error when ESO plugin not using a generated key', async () => {
        await plugin.setup(coreSetup, {
          ...pluginsSetup,
          encryptedSavedObjects: {
            ...pluginsSetup.encryptedSavedObjects,
            usingEphemeralEncryptionKey: false,
          },
        });
        const pluginStart = plugin.start(coreStart, pluginsStart);

        await pluginStart.getActionsClientWithRequest(httpServerMock.createKibanaRequest());
      });

      it('should throw error when ESO plugin using generated key', async () => {
        await plugin.setup(coreSetup, pluginsSetup);
        const pluginStart = plugin.start(coreStart, pluginsStart);

        expect(pluginsSetup.encryptedSavedObjects.usingEphemeralEncryptionKey).toEqual(true);
        await expect(
          pluginStart.getActionsClientWithRequest(httpServerMock.createKibanaRequest())
        ).rejects.toThrowErrorMatchingInlineSnapshot(
          `"Unable to create actions client due to the Encrypted Saved Objects plugin using an ephemeral encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in kibana.yml"`
        );
      });
    });
  });
});
