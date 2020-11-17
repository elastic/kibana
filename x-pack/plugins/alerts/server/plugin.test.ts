/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertingPlugin, AlertingPluginsSetup, AlertingPluginsStart } from './plugin';
import { coreMock, statusServiceMock } from '../../../../src/core/server/mocks';
import { licensingMock } from '../../licensing/server/mocks';
import { encryptedSavedObjectsMock } from '../../encrypted_saved_objects/server/mocks';
import { taskManagerMock } from '../../task_manager/server/mocks';
import { eventLogServiceMock } from '../../event_log/server/event_log_service.mock';
import { KibanaRequest, CoreSetup } from 'kibana/server';
import { featuresPluginMock } from '../../features/server/mocks';
import { KibanaFeature } from '../../features/server';
import { AlertsConfig } from './config';

describe('Alerting Plugin', () => {
  describe('setup()', () => {
    it('should log warning when Encrypted Saved Objects plugin is using an ephemeral encryption key', async () => {
      const context = coreMock.createPluginInitializerContext<AlertsConfig>({
        healthCheck: {
          interval: '5m',
        },
        invalidateApiKeysTask: {
          interval: '5m',
          removalDelay: '5m',
        },
      });
      const plugin = new AlertingPlugin(context);

      const coreSetup = coreMock.createSetup();
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
        'APIs are disabled because the Encrypted Saved Objects plugin uses an ephemeral encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in the kibana.yml or use the bin/kibana-encryption-key command.'
      );
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
            removalDelay: '5m',
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
          } as unknown) as AlertingPluginsStart
        );

        expect(encryptedSavedObjectsSetup.usingEphemeralEncryptionKey).toEqual(true);
        expect(() =>
          startContract.getAlertsClientWithRequest({} as KibanaRequest)
        ).toThrowErrorMatchingInlineSnapshot(
          `"Unable to create alerts client due to the Encrypted Saved Objects plugin using an ephemeral encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in kibana.yml manually or by using bin/kibana-encryption-key."`
        );
      });

      it(`doesn't throw error when encryptedSavedObjects plugin has usingEphemeralEncryptionKey set to false`, async () => {
        const context = coreMock.createPluginInitializerContext<AlertsConfig>({
          healthCheck: {
            interval: '5m',
          },
          invalidateApiKeysTask: {
            interval: '5m',
            removalDelay: '5m',
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
            spaces: () => null,
            encryptedSavedObjects: encryptedSavedObjectsMock.createStart(),
            features: mockFeatures(),
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
