/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertingPlugin, AlertingPluginsSetup, PluginSetupContract } from './plugin';
import { coreMock, statusServiceMock } from '../../../../src/core/server/mocks';
import { licensingMock } from '../../licensing/server/mocks';
import { encryptedSavedObjectsMock } from '../../encrypted_saved_objects/server/mocks';
import { taskManagerMock } from '../../task_manager/server/mocks';
import { eventLogServiceMock } from '../../event_log/server/event_log_service.mock';
import { KibanaRequest } from 'kibana/server';
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

    describe('registerType()', () => {
      let setup: PluginSetupContract;
      const sampleAlertType: AlertType<never, never, never, never, 'default'> = {
        id: 'test',
        name: 'test',
        minimumLicenseRequired: 'basic',
        actionGroups: [],
        defaultActionGroupId: 'default',
        producer: 'test',
        async executor() {},
      };

      beforeEach(async () => {
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
        pluginsSetup = {
          taskManager: taskManagerMock.createSetup(),
          encryptedSavedObjects: encryptedSavedObjectsMock.createSetup(),
          licensing: licensingMock.createSetup(),
          eventLog: eventLogMock.createSetup(),
          actions: actionsMock.createSetup(),
          statusService: statusServiceMock.createSetupContract(),
        };
        setup = plugin.setup(coreSetup, pluginsSetup);
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
    describe('getAlertsClientWithRequest()', () => {
      it(`should start without errors with all deps defined`, async () => {
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

        const encryptedSavedObjectsSetup = {
          ...encryptedSavedObjectsMock.createSetup(),
        };
        plugin.setup(coreMock.createSetup(), {
          licensing: licensingMock.createSetup(),
          encryptedSavedObjects: encryptedSavedObjectsSetup,
          taskManager: taskManagerMock.createSetup(),
          eventLog: eventLogServiceMock.create(),
          actions: actionsMock.createSetup(),
          statusService: statusServiceMock.createSetupContract(),
        });

        const startContract = plugin.start(coreMock.createStart(), {
          actions: actionsMock.createStart(),
          encryptedSavedObjects: encryptedSavedObjectsMock.createStart(),
          features: mockFeatures(),
          licensing: licensingMock.createStart(),
          eventLog: eventLogMock.createStart(),
          taskManager: taskManagerMock.createStart(),
        });

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
        startContract.getAlertsClientWithRequest(fakeRequest);
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
