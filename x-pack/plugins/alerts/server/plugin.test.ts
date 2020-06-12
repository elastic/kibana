/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertingPlugin, AlertingPluginsSetup, AlertingPluginsStart } from './plugin';
import { coreMock } from '../../../../src/core/server/mocks';
import { licensingMock } from '../../licensing/server/mocks';
import { encryptedSavedObjectsMock } from '../../encrypted_saved_objects/server/mocks';
import { taskManagerMock } from '../../task_manager/server/mocks';
import { eventLogServiceMock } from '../../event_log/server/event_log_service.mock';
import { KibanaRequest, CoreSetup } from 'kibana/server';
import { featuresPluginMock } from '../../features/server/mocks';

describe('Alerting Plugin', () => {
  describe('setup()', () => {
    it('should log warning when Encrypted Saved Objects plugin is using an ephemeral encryption key', async () => {
      const context = coreMock.createPluginInitializerContext();
      const plugin = new AlertingPlugin(context);

      const coreSetup = coreMock.createSetup();
      const encryptedSavedObjectsSetup = encryptedSavedObjectsMock.createSetup();
      await plugin.setup(
        ({
          ...coreSetup,
          http: {
            ...coreSetup.http,
            route: jest.fn(),
          },
        } as unknown) as CoreSetup<AlertingPluginsStart, unknown>,
        ({
          licensing: licensingMock.createSetup(),
          encryptedSavedObjects: encryptedSavedObjectsSetup,
          taskManager: taskManagerMock.createSetup(),
          eventLog: eventLogServiceMock.create(),
          features: featuresPluginMock.createSetup(),
        } as unknown) as AlertingPluginsSetup
      );

      expect(encryptedSavedObjectsSetup.usingEphemeralEncryptionKey).toEqual(true);
      expect(context.logger.get().warn).toHaveBeenCalledWith(
        'APIs are disabled due to the Encrypted Saved Objects plugin using an ephemeral encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in kibana.yml.'
      );
    });

    it('should grant global `all` priviliges to built in AlertTypes for anyone with `all` priviliges to alerts', async () => {
      const context = coreMock.createPluginInitializerContext();
      const plugin = new AlertingPlugin(context);

      const coreSetup = coreMock.createSetup();
      const encryptedSavedObjectsSetup = encryptedSavedObjectsMock.createSetup();
      const features = featuresPluginMock.createSetup();
      await plugin.setup(
        ({
          ...coreSetup,
          http: {
            ...coreSetup.http,
            route: jest.fn(),
          },
        } as unknown) as CoreSetup<AlertingPluginsStart, unknown>,
        ({
          licensing: licensingMock.createSetup(),
          encryptedSavedObjects: encryptedSavedObjectsSetup,
          taskManager: taskManagerMock.createSetup(),
          eventLog: eventLogServiceMock.create(),
          features,
        } as unknown) as AlertingPluginsSetup
      );

      expect(features.registerFeature).toHaveBeenCalledTimes(1);
      const { privileges } = features.registerFeature.mock.calls[0][0];

      expect(privileges?.all.alerting).toMatchInlineSnapshot(`
        Object {
          "all": Array [
            ".index-threshold",
          ],
        }
      `);
    });

    it('should grant global `read` priviliges to built in AlertTypes for anyone with `read` priviliges to alerts', async () => {
      const context = coreMock.createPluginInitializerContext();
      const plugin = new AlertingPlugin(context);

      const coreSetup = coreMock.createSetup();
      const encryptedSavedObjectsSetup = encryptedSavedObjectsMock.createSetup();
      const features = featuresPluginMock.createSetup();
      await plugin.setup(
        ({
          ...coreSetup,
          http: {
            ...coreSetup.http,
            route: jest.fn(),
          },
        } as unknown) as CoreSetup<AlertingPluginsStart, unknown>,
        ({
          licensing: licensingMock.createSetup(),
          encryptedSavedObjects: encryptedSavedObjectsSetup,
          taskManager: taskManagerMock.createSetup(),
          eventLog: eventLogServiceMock.create(),
          features,
        } as unknown) as AlertingPluginsSetup
      );

      expect(features.registerFeature).toHaveBeenCalledTimes(1);
      const { privileges } = features.registerFeature.mock.calls[0][0];

      expect(privileges?.read.alerting).toMatchInlineSnapshot(`
        Object {
          "read": Array [
            ".index-threshold",
          ],
        }
      `);
    });
  });

  describe('start()', () => {
    /**
     * HACK: This test has put together to ensuire the function "getAlertsClientWithRequest"
     * throws when needed. There's a lot of blockers for writing a proper test like
     * misisng plugin start/setup mocks for taskManager and actions plugin, core.http.route
     * is actually not a function in Kibana Platform, etc. This test contains what is needed
     * to get to the necessary function within start().
     */
    describe('getAlertsClientWithRequest()', () => {
      it('throws error when encryptedSavedObjects plugin has usingEphemeralEncryptionKey set to true', async () => {
        const context = coreMock.createPluginInitializerContext();
        const plugin = new AlertingPlugin(context);

        const coreSetup = coreMock.createSetup();
        const encryptedSavedObjectsSetup = encryptedSavedObjectsMock.createSetup();
        await plugin.setup(
          ({
            ...coreSetup,
            http: {
              ...coreSetup.http,
              route: jest.fn(),
            },
          } as unknown) as CoreSetup<AlertingPluginsStart, unknown>,
          ({
            licensing: licensingMock.createSetup(),
            encryptedSavedObjects: encryptedSavedObjectsSetup,
            taskManager: taskManagerMock.createSetup(),
            eventLog: eventLogServiceMock.create(),
            features: featuresPluginMock.createSetup(),
          } as unknown) as AlertingPluginsSetup
        );

        const startContract = plugin.start(
          coreMock.createStart() as ReturnType<typeof coreMock.createStart>,
          ({
            actions: {
              execute: jest.fn(),
              getActionsClientWithRequest: jest.fn(),
            },
            encryptedSavedObjects: encryptedSavedObjectsMock.createStart(),
          } as unknown) as AlertingPluginsStart
        );

        expect(encryptedSavedObjectsSetup.usingEphemeralEncryptionKey).toEqual(true);
        expect(() =>
          startContract.getAlertsClientWithRequest({} as KibanaRequest)
        ).toThrowErrorMatchingInlineSnapshot(
          `"Unable to create alerts client due to the Encrypted Saved Objects plugin using an ephemeral encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in kibana.yml"`
        );
      });

      it(`doesn't throw error when encryptedSavedObjects plugin has usingEphemeralEncryptionKey set to false`, async () => {
        const context = coreMock.createPluginInitializerContext();
        const plugin = new AlertingPlugin(context);

        const coreSetup = coreMock.createSetup();
        const encryptedSavedObjectsSetup = {
          ...encryptedSavedObjectsMock.createSetup(),
          usingEphemeralEncryptionKey: false,
        };
        await plugin.setup(
          ({
            ...coreSetup,
            http: {
              ...coreSetup.http,
              route: jest.fn(),
            },
          } as unknown) as CoreSetup<AlertingPluginsStart, unknown>,
          ({
            licensing: licensingMock.createSetup(),
            encryptedSavedObjects: encryptedSavedObjectsSetup,
            taskManager: taskManagerMock.createSetup(),
            eventLog: eventLogServiceMock.create(),
            features: featuresPluginMock.createSetup(),
          } as unknown) as AlertingPluginsSetup
        );

        const startContract = plugin.start(
          coreMock.createStart() as ReturnType<typeof coreMock.createStart>,
          ({
            actions: {
              execute: jest.fn(),
              getActionsClientWithRequest: jest.fn(),
            },
            spaces: () => null,
            encryptedSavedObjects: encryptedSavedObjectsMock.createStart(),
          } as unknown) as AlertingPluginsStart
        );

        const fakeRequest = ({
          headers: {},
          getBasePath: () => '',
          path: '/',
          route: { settings: {} },
          url: {
            href: '/',
          },
          raw: {
            req: {
              url: '/',
            },
          },
          getSavedObjectsClient: jest.fn(),
        } as unknown) as KibanaRequest;
        await startContract.getAlertsClientWithRequest(fakeRequest);
      });
    });
  });
});
