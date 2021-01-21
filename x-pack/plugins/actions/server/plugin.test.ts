/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializerContext, RequestHandlerContext } from '../../../../src/core/server';
import { coreMock, httpServerMock } from '../../../../src/core/server/mocks';
import { usageCollectionPluginMock } from '../../../../src/plugins/usage_collection/server/mocks';
import { licensingMock } from '../../licensing/server/mocks';
import { featuresPluginMock } from '../../features/server/mocks';
import { encryptedSavedObjectsMock } from '../../encrypted_saved_objects/server/mocks';
import { taskManagerMock } from '../../task_manager/server/mocks';
import { eventLogMock } from '../../event_log/server/mocks';
import { ActionType } from './types';
import { ActionsConfig } from './config';
import {
  ActionsPlugin,
  ActionsPluginsSetup,
  ActionsPluginsStart,
  PluginSetupContract,
} from './plugin';

describe('Actions Plugin', () => {
  describe('setup()', () => {
    let context: PluginInitializerContext;
    let plugin: ActionsPlugin;
    let coreSetup: ReturnType<typeof coreMock.createSetup>;
    let pluginsSetup: jest.Mocked<ActionsPluginsSetup>;

    beforeEach(() => {
      context = coreMock.createPluginInitializerContext<ActionsConfig>({
        enabled: true,
        enabledActionTypes: ['*'],
        allowedHosts: ['*'],
        preconfigured: {},
        proxyRejectUnauthorizedCertificates: true,
        rejectUnauthorized: true,
      });
      plugin = new ActionsPlugin(context);
      coreSetup = coreMock.createSetup();

      pluginsSetup = {
        taskManager: taskManagerMock.createSetup(),
        encryptedSavedObjects: encryptedSavedObjectsMock.createSetup(),
        licensing: licensingMock.createSetup(),
        eventLog: eventLogMock.createSetup(),
        usageCollection: usageCollectionPluginMock.createSetupContract(),
        features: featuresPluginMock.createSetup(),
      };
    });

    describe('registerType()', () => {
      let setup: PluginSetupContract;
      const sampleActionType: ActionType = {
        id: 'test',
        name: 'test',
        minimumLicenseRequired: 'basic',
        async executor(options) {
          return { status: 'ok', actionId: options.actionId };
        },
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
      const context = coreMock.createPluginInitializerContext<ActionsConfig>({
        enabled: true,
        enabledActionTypes: ['*'],
        allowedHosts: ['*'],
        preconfigured: {
          preconfiguredServerLog: {
            actionTypeId: '.server-log',
            name: 'preconfigured-server-log',
            config: {},
            secrets: {},
          },
        },
        proxyRejectUnauthorizedCertificates: true,
        rejectUnauthorized: true,
      });
      plugin = new ActionsPlugin(context);
      coreSetup = coreMock.createSetup();
      coreStart = coreMock.createStart();
      pluginsSetup = {
        taskManager: taskManagerMock.createSetup(),
        encryptedSavedObjects: encryptedSavedObjectsMock.createSetup(),
        licensing: licensingMock.createSetup(),
        eventLog: eventLogMock.createSetup(),
        usageCollection: usageCollectionPluginMock.createSetupContract(),
        features: featuresPluginMock.createSetup(),
      };
      pluginsStart = {
        licensing: licensingMock.createStart(),
        taskManager: taskManagerMock.createStart(),
        encryptedSavedObjects: encryptedSavedObjectsMock.createStart(),
      };
    });

    describe('getActionsClientWithRequest()', () => {
      it('should handle preconfigured actions', async () => {
        // coreMock.createSetup doesn't support Plugin generics
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await plugin.setup(coreSetup as any, pluginsSetup);
        const pluginStart = await plugin.start(coreStart, pluginsStart);

        expect(pluginStart.isActionExecutable('preconfiguredServerLog', '.server-log')).toBe(true);
      });
    });

    describe('isActionTypeEnabled()', () => {
      const actionType: ActionType = {
        id: 'my-action-type',
        name: 'My action type',
        minimumLicenseRequired: 'gold',
        executor: jest.fn(),
      };

      it('passes through the notifyUsage option when set to true', async () => {
        // coreMock.createSetup doesn't support Plugin generics
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pluginSetup = await plugin.setup(coreSetup as any, pluginsSetup);
        pluginSetup.registerType(actionType);
        const pluginStart = plugin.start(coreStart, pluginsStart);

        pluginStart.isActionTypeEnabled('my-action-type', { notifyUsage: true });
        expect(pluginsStart.licensing.featureUsage.notifyUsage).toHaveBeenCalledWith(
          'Connector: My action type'
        );
      });
    });

    describe('isActionExecutable()', () => {
      const actionType: ActionType = {
        id: 'my-action-type',
        name: 'My action type',
        minimumLicenseRequired: 'gold',
        executor: jest.fn(),
      };

      it('passes through the notifyUsage option when set to true', async () => {
        // coreMock.createSetup doesn't support Plugin generics
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pluginSetup = await plugin.setup(coreSetup as any, pluginsSetup);
        pluginSetup.registerType(actionType);
        const pluginStart = plugin.start(coreStart, pluginsStart);

        pluginStart.isActionExecutable('123', 'my-action-type', { notifyUsage: true });
        expect(pluginsStart.licensing.featureUsage.notifyUsage).toHaveBeenCalledWith(
          'Connector: My action type'
        );
      });
    });
  });
});
