/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AlertingPlugin,
  AlertingPluginsSetup,
  AlertingPluginsStart,
  PluginSetupContract,
} from './plugin';
import { coreMock, statusServiceMock } from '../../../../src/core/server/mocks';
import { licensingMock } from '../../licensing/server/mocks';
import { encryptedSavedObjectsMock } from '../../encrypted_saved_objects/server/mocks';
import { taskManagerMock } from '../../task_manager/server/mocks';
import { eventLogServiceMock } from '../../event_log/server/event_log_service.mock';
import { KibanaRequest, CoreSetup } from 'kibana/server';
import { featuresPluginMock } from '../../features/server/mocks';
import { KibanaFeature } from '../../features/server';
import { AlertsConfig } from './config';
import { AlertType } from './types';
import { eventLogMock } from '../../event_log/server/mocks';
import { actionsMock } from '../../actions/server/mocks';

describe('Alerting Plugin', () => {
  describe('setup()', () => {
    let plugin: AlertingPlugin;
    let coreSetup: ReturnType<typeof coreMock.createSetup>;
    let pluginsSetup: jest.Mocked<AlertingPluginsSetup>;

    it('should log warning when Encrypted Saved Objects plugin is using an ephemeral encryption key', async () => {
      const context = coreMock.createPluginInitializerContext<AlertsConfig>({
        healthCheck: {
          interval: '5m',
        },
        invalidateApiKeysTask: {
          interval: '5m',
          removalDelay: '1h',
        },
      });
      plugin = new AlertingPlugin(context);

      coreSetup = coreMock.createSetup();
      const encryptedSavedObjectsSetup = encryptedSavedObjectsMock.createSetup();
      const statusMock = statusServiceMock.createSetupContract();
      await plugin.setup(
        ({
          ...coreSetup,
          http: {
            ...coreSetup.http,
            route: jest.fn(),
          },
          status: statusMock,
        } as unknown) as CoreSetup<AlertingPluginsStart, unknown>,
        ({
          licensing: licensingMock.createSetup(),
          encryptedSavedObjects: encryptedSavedObjectsSetup,
          taskManager: taskManagerMock.createSetup(),
          eventLog: eventLogServiceMock.create(),
        } as unknown) as AlertingPluginsSetup
      );

      expect(statusMock.set).toHaveBeenCalledTimes(1);
      expect(encryptedSavedObjectsSetup.usingEphemeralEncryptionKey).toEqual(true);
      expect(context.logger.get().warn).toHaveBeenCalledWith(
        'APIs are disabled because the Encrypted Saved Objects plugin uses an ephemeral encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in the kibana.yml or use the bin/kibana-encryption-keys command.'
      );
    });

    describe('registerType()', () => {
      let setup: PluginSetupContract;
      const sampleAlertType: AlertType = {
        id: 'test',
        name: 'test',
        minimumLicenseRequired: 'basic',
        actionGroups: [],
        defaultActionGroupId: 'default',
        producer: 'test',
        async executor() {},
      };

      beforeEach(async () => {
        coreSetup = coreMock.createSetup();
        pluginsSetup = {
          taskManager: taskManagerMock.createSetup(),
          encryptedSavedObjects: encryptedSavedObjectsMock.createSetup(),
          licensing: licensingMock.createSetup(),
          eventLog: eventLogMock.createSetup(),
          actions: actionsMock.createSetup(),
          statusService: statusServiceMock.createSetupContract(),
        };
        setup = await plugin.setup(coreSetup, pluginsSetup);
      });

      it('should throw error when license type is invalid', async () => {
        expect(() =>
          setup.registerType({
            ...sampleAlertType,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            minimumLicenseRequired: 'foo' as any,
          })
        ).toThrowErrorMatchingInlineSnapshot(`"\\"foo\\" is not a valid license type"`);
      });

      it('should not throw when license type is gold', async () => {
        setup.registerType({
          ...sampleAlertType,
          minimumLicenseRequired: 'gold',
        });
      });

      it('should not throw when license type is basic', async () => {
        setup.registerType({
          ...sampleAlertType,
          minimumLicenseRequired: 'basic',
        });
      });
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
        const context = coreMock.createPluginInitializerContext<AlertsConfig>({
          healthCheck: {
            interval: '5m',
          },
          invalidateApiKeysTask: {
            interval: '5m',
            removalDelay: '1h',
          },
        });
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
          } as unknown) as AlertingPluginsSetup
        );

        const startContract = plugin.start(
          coreMock.createStart() as ReturnType<typeof coreMock.createStart>,
          ({
            actions: {
              execute: jest.fn(),
              getActionsClientWithRequest: jest.fn(),
              getActionsAuthorizationWithRequest: jest.fn(),
            },
            encryptedSavedObjects: encryptedSavedObjectsMock.createStart(),
            features: mockFeatures(),
            licensing: licensingMock.createStart(),
          } as unknown) as AlertingPluginsStart
        );

        expect(encryptedSavedObjectsSetup.usingEphemeralEncryptionKey).toEqual(true);
        expect(() =>
          startContract.getAlertsClientWithRequest({} as KibanaRequest)
        ).toThrowErrorMatchingInlineSnapshot(
          `"Unable to create alerts client because the Encrypted Saved Objects plugin uses an ephemeral encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in the kibana.yml or use the bin/kibana-encryption-keys command."`
        );
      });

      it(`doesn't throw error when encryptedSavedObjects plugin has usingEphemeralEncryptionKey set to false`, async () => {
        const context = coreMock.createPluginInitializerContext<AlertsConfig>({
          healthCheck: {
            interval: '5m',
          },
          invalidateApiKeysTask: {
            interval: '5m',
            removalDelay: '1h',
          },
        });
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
          } as unknown) as AlertingPluginsSetup
        );

        const startContract = plugin.start(
          coreMock.createStart() as ReturnType<typeof coreMock.createStart>,
          ({
            actions: {
              execute: jest.fn(),
              getActionsClientWithRequest: jest.fn(),
              getActionsAuthorizationWithRequest: jest.fn(),
            },
            encryptedSavedObjects: encryptedSavedObjectsMock.createStart(),
            features: mockFeatures(),
            licensing: licensingMock.createStart(),
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

function mockFeatures() {
  const features = featuresPluginMock.createSetup();
  features.getKibanaFeatures.mockReturnValue([
    new KibanaFeature({
      id: 'appName',
      name: 'appName',
      app: [],
      category: { id: 'foo', label: 'foo' },
      privileges: {
        all: {
          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
        },
        read: {
          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
        },
      },
    }),
  ]);
  return features;
}
