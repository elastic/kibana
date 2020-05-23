/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializerContext, RequestHandlerContext } from '../../../../src/core/server';
import { coreMock, httpServerMock } from '../../../../src/core/server/mocks';
import { licensingMock } from '../../licensing/server/mocks';
import { encryptedSavedObjectsMock } from '../../encrypted_saved_objects/server/mocks';
import { taskManagerMock } from '../../task_manager/server/mocks';
import { eventLogMock } from '../../event_log/server/mocks';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { ActionType } from './types';
import {
  ActionsPlugin,
  ActionsPluginsSetup,
  ActionsPluginsStart,
  PluginSetupContract,
} from './plugin';

describe('Actions Plugin', () => {
  const usageCollectionMock: jest.Mocked<UsageCollectionSetup> = ({
    makeUsageCollector: jest.fn(),
    registerCollector: jest.fn(),
  } as unknown) as jest.Mocked<UsageCollectionSetup>;
  describe('setup()', () => {
    let context: PluginInitializerContext;
    let plugin: ActionsPlugin;
    let coreSetup: ReturnType<typeof coreMock.createSetup>;
    let pluginsSetup: jest.Mocked<ActionsPluginsSetup>;

    beforeEach(() => {
      context = coreMock.createPluginInitializerContext({
        preconfigured: [
          {
            id: 'my-slack1',
            actionTypeId: '.slack',
            name: 'Slack #xyz',
            description: 'Send a message to the #xyz channel',
            config: {
              webhookUrl: 'https://hooks.slack.com/services/abcd/efgh/ijklmnopqrstuvwxyz',
            },
          },
          {
            id: 'custom-system-abc-connector',
            actionTypeId: 'system-abc-action-type',
            description: 'Send a notification to system ABC',
            name: 'System ABC',
            config: {
              xyzConfig1: 'value1',
              xyzConfig2: 'value2',
              listOfThings: ['a', 'b', 'c', 'd'],
            },
            secrets: {
              xyzSecret1: 'credential1',
              xyzSecret2: 'credential2',
            },
          },
        ],
      });
      plugin = new ActionsPlugin(context);
      coreSetup = coreMock.createSetup();

      pluginsSetup = {
        taskManager: taskManagerMock.createSetup(),
        encryptedSavedObjects: encryptedSavedObjectsMock.createSetup(),
        licensing: licensingMock.createSetup(),
        eventLog: eventLogMock.createSetup(),
        usageCollection: usageCollectionMock,
      };
    });

    it('should log warning when Encrypted Saved Objects plugin is using an ephemeral encryption key', async () => {
      // coreMock.createSetup doesn't support Plugin generics
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await plugin.setup(coreSetup as any, pluginsSetup);
      expect(pluginsSetup.encryptedSavedObjects.usingEphemeralEncryptionKey).toEqual(true);
      expect(context.logger.get().warn).toHaveBeenCalledWith(
        'APIs are disabled due to the Encrypted Saved Objects plugin using an ephemeral encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in kibana.yml.'
      );
    });

    describe('routeHandlerContext.getActionsClient()', () => {
      it('should not throw error when ESO plugin not using a generated key', async () => {
        // coreMock.createSetup doesn't support Plugin generics
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await plugin.setup(coreSetup as any, {
          ...pluginsSetup,
          encryptedSavedObjects: {
            ...pluginsSetup.encryptedSavedObjects,
            usingEphemeralEncryptionKey: false,
          },
        });

        expect(coreSetup.http.registerRouteHandlerContext).toHaveBeenCalledTimes(1);
        const handler = coreSetup.http.registerRouteHandlerContext.mock.calls[0];
        expect(handler[0]).toEqual('actions');

        const actionsContextHandler = ((await handler[1](
          ({
            core: {
              savedObjects: {
                client: {},
              },
              elasticsearch: {
                adminClient: jest.fn(),
              },
            },
          } as unknown) as RequestHandlerContext,
          httpServerMock.createKibanaRequest(),
          httpServerMock.createResponseFactory()
        )) as unknown) as RequestHandlerContext['actions'];
        actionsContextHandler!.getActionsClient();
      });

      it('should throw error when ESO plugin using a generated key', async () => {
        // coreMock.createSetup doesn't support Plugin generics
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await plugin.setup(coreSetup as any, pluginsSetup);

        expect(coreSetup.http.registerRouteHandlerContext).toHaveBeenCalledTimes(1);
        const handler = coreSetup.http.registerRouteHandlerContext.mock.calls[0];
        expect(handler[0]).toEqual('actions');

        const actionsContextHandler = ((await handler[1](
          ({
            core: {
              savedObjects: {
                client: {},
              },
            },
          } as unknown) as RequestHandlerContext,
          httpServerMock.createKibanaRequest(),
          httpServerMock.createResponseFactory()
        )) as unknown) as RequestHandlerContext['actions'];
        expect(() => actionsContextHandler!.getActionsClient()).toThrowErrorMatchingInlineSnapshot(
          `"Unable to create actions client due to the Encrypted Saved Objects plugin using an ephemeral encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in kibana.yml"`
        );
      });
    });

    describe('registerType()', () => {
      let setup: PluginSetupContract;
      const sampleActionType: ActionType = {
        id: 'test',
        name: 'test',
        minimumLicenseRequired: 'basic',
        async executor() {},
      };

      beforeEach(async () => {
        // coreMock.createSetup doesn't support Plugin generics
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setup = await plugin.setup(coreSetup as any, pluginsSetup);
      });

      it('should throw error when license type is invalid', async () => {
        expect(() =>
          setup.registerType({
            ...sampleActionType,
            // we're faking an invalid value, this requires stripping the typing
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            minimumLicenseRequired: 'foo' as any,
          })
        ).toThrowErrorMatchingInlineSnapshot(`"\\"foo\\" is not a valid license type"`);
      });

      it('should throw error when license type is less than gold', async () => {
        expect(() =>
          setup.registerType({
            ...sampleActionType,
            minimumLicenseRequired: 'basic',
          })
        ).toThrowErrorMatchingInlineSnapshot(
          `"Third party action type \\"test\\" can only set minimumLicenseRequired to a gold license or higher"`
        );
      });

      it('should not throw when license type is gold', async () => {
        setup.registerType({
          ...sampleActionType,
          minimumLicenseRequired: 'gold',
        });
      });

      it('should not throw when license type is higher than gold', async () => {
        setup.registerType({
          ...sampleActionType,
          minimumLicenseRequired: 'platinum',
        });
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
      const context = coreMock.createPluginInitializerContext({
        preconfigured: [],
      });
      plugin = new ActionsPlugin(context);
      coreSetup = coreMock.createSetup();
      coreStart = coreMock.createStart();
      pluginsSetup = {
        taskManager: taskManagerMock.createSetup(),
        encryptedSavedObjects: encryptedSavedObjectsMock.createSetup(),
        licensing: licensingMock.createSetup(),
        eventLog: eventLogMock.createSetup(),
        usageCollection: usageCollectionMock,
      };
      pluginsStart = {
        taskManager: taskManagerMock.createStart(),
        encryptedSavedObjects: encryptedSavedObjectsMock.createStart(),
      };
    });

    describe('getActionsClientWithRequest()', () => {
      it('should not throw error when ESO plugin not using a generated key', async () => {
        // coreMock.createSetup doesn't support Plugin generics
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await plugin.setup(coreSetup as any, {
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
        // coreMock.createSetup doesn't support Plugin generics
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await plugin.setup(coreSetup as any, pluginsSetup);
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
