/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { duration } from 'moment';
import { coreMock } from '@kbn/core/public/mocks';
import { cloudMock } from '@kbn/cloud-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { CloudExperimentsPluginStart } from '../common';
import { FEATURE_FLAG_NAMES } from '../common/constants';
import { CloudExperimentsPlugin } from './plugin';
import { LaunchDarklyClient } from './launch_darkly_client';
import { MetadataService } from '../common/metadata_service';
jest.mock('./launch_darkly_client');

function getLaunchDarklyClientInstanceMock() {
  const launchDarklyClientInstanceMock = (
    LaunchDarklyClient as jest.MockedClass<typeof LaunchDarklyClient>
  ).mock.instances[0] as jest.Mocked<LaunchDarklyClient>;

  return launchDarklyClientInstanceMock;
}

describe('Cloud Experiments public plugin', () => {
  jest.spyOn(console, 'debug').mockImplementation(); // silence console.debug logs

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('successfully creates a new plugin if provided an empty configuration', () => {
      const initializerContext = coreMock.createPluginInitializerContext();
      // @ts-expect-error it's defined as readonly but the mock is not.
      initializerContext.env.mode.dev = true; // ensure it's true
      const plugin = new CloudExperimentsPlugin(initializerContext);
      expect(plugin).toHaveProperty('setup');
      expect(plugin).toHaveProperty('start');
      expect(plugin).toHaveProperty('stop');
      expect(plugin).toHaveProperty('flagOverrides', undefined);
      expect(plugin).toHaveProperty('launchDarklyClient', undefined);
      expect(plugin).toHaveProperty('metadataService', expect.any(MetadataService));
    });

    test('fails if launch_darkly is not provided in the config and it is a non-dev environment', () => {
      const initializerContext = coreMock.createPluginInitializerContext();
      // @ts-expect-error it's defined as readonly but the mock is not.
      initializerContext.env.mode.dev = false;
      expect(() => new CloudExperimentsPlugin(initializerContext)).toThrowError(
        'xpack.cloud_integrations.experiments.launch_darkly configuration should exist'
      );
    });

    test('it initializes the flagOverrides property', () => {
      const initializerContext = coreMock.createPluginInitializerContext({
        flag_overrides: { my_flag: '1234' },
      });
      // @ts-expect-error it's defined as readonly but the mock is not.
      initializerContext.env.mode.dev = true; // ensure it's true
      const plugin = new CloudExperimentsPlugin(initializerContext);
      expect(plugin).toHaveProperty('flagOverrides', { my_flag: '1234' });
    });

    test('it initializes the LaunchDarkly client', () => {
      const initializerContext = coreMock.createPluginInitializerContext({
        launch_darkly: { client_id: 'sdk-1234' },
      });
      const plugin = new CloudExperimentsPlugin(initializerContext);
      expect(LaunchDarklyClient).toHaveBeenCalledTimes(1);
      expect(plugin).toHaveProperty('launchDarklyClient', expect.any(LaunchDarklyClient));
    });
  });

  describe('setup', () => {
    let plugin: CloudExperimentsPlugin;
    let metadataServiceSetupSpy: jest.SpyInstance;

    beforeEach(() => {
      const initializerContext = coreMock.createPluginInitializerContext({
        launch_darkly: { client_id: '1234' },
        flag_overrides: { my_flag: '1234' },
        metadata_refresh_interval: duration(1, 'h'),
      });
      plugin = new CloudExperimentsPlugin(initializerContext);
      // eslint-disable-next-line dot-notation
      metadataServiceSetupSpy = jest.spyOn(plugin['metadataService'], 'setup');
    });

    afterEach(() => {
      plugin.stop();
    });

    test('returns no contract', () => {
      expect(
        plugin.setup(coreMock.createSetup(), {
          cloud: cloudMock.createSetup(),
        })
      ).toBeUndefined();
    });

    describe('identifyUser', () => {
      test('it skips creating the client if no client id provided in the config', () => {
        const initializerContext = coreMock.createPluginInitializerContext({
          flag_overrides: { my_flag: '1234' },
          metadata_refresh_interval: duration(1, 'h'),
        });
        const customPlugin = new CloudExperimentsPlugin(initializerContext);
        customPlugin.setup(coreMock.createSetup(), {
          cloud: { ...cloudMock.createSetup(), isCloudEnabled: true },
        });
        expect(customPlugin).toHaveProperty('launchDarklyClient', undefined);
      });

      test('it skips identifying the user if cloud is not enabled and cancels loading the LDclient', () => {
        const ldClientCancelSpy = jest.spyOn(LaunchDarklyClient.prototype, 'cancel');
        plugin.setup(coreMock.createSetup(), {
          cloud: { ...cloudMock.createSetup(), isCloudEnabled: false },
        });

        expect(metadataServiceSetupSpy).not.toHaveBeenCalled();
        expect(ldClientCancelSpy).toHaveBeenCalled(); // Cancel loading the client
      });

      test('it initializes the LaunchDarkly client', async () => {
        const ldClientCancelSpy = jest.spyOn(LaunchDarklyClient.prototype, 'cancel');
        plugin.setup(coreMock.createSetup(), {
          cloud: { ...cloudMock.createSetup(), isCloudEnabled: true },
        });

        expect(metadataServiceSetupSpy).toHaveBeenCalledWith({
          isElasticStaff: true,
          kibanaVersion: 'version',
          trialEndDate: '2020-10-01T14:13:12.000Z',
          userId: 'mock-deployment-id',
        });
        expect(ldClientCancelSpy).not.toHaveBeenCalled();
      });
    });
  });

  describe('start', () => {
    let plugin: CloudExperimentsPlugin;
    let launchDarklyInstanceMock: jest.Mocked<LaunchDarklyClient>;

    const firstKnownFlag = Object.keys(FEATURE_FLAG_NAMES)[0] as keyof typeof FEATURE_FLAG_NAMES;

    beforeEach(() => {
      const initializerContext = coreMock.createPluginInitializerContext({
        launch_darkly: { client_id: '1234' },
        flag_overrides: { [firstKnownFlag]: '1234' },
      });
      plugin = new CloudExperimentsPlugin(initializerContext);
      launchDarklyInstanceMock = getLaunchDarklyClientInstanceMock();
    });

    afterEach(() => {
      plugin.stop();
    });

    test('returns the contract', () => {
      plugin.setup(coreMock.createSetup(), { cloud: cloudMock.createSetup() });
      const startContract = plugin.start(coreMock.createStart(), {
        cloud: cloudMock.createStart(),
        dataViews: dataViewPluginMocks.createStartContract(),
      });
      expect(startContract).toStrictEqual(
        expect.objectContaining({
          getVariation: expect.any(Function),
          reportMetric: expect.any(Function),
        })
      );
    });

    test('triggers a userMetadataUpdate for `hasData`', async () => {
      plugin.setup(coreMock.createSetup(), {
        cloud: { ...cloudMock.createSetup(), isCloudEnabled: true },
      });

      const dataViews = dataViewPluginMocks.createStartContract();
      plugin.start(coreMock.createStart(), { cloud: cloudMock.createStart(), dataViews });

      // After scheduler kicks in...
      await new Promise((resolve) => setTimeout(resolve, 200));
      // Using a timeout of 0ms to let the `timer` kick in.
      // For some reason, fakeSchedulers is not working on browser-side tests :shrug:
      expect(launchDarklyInstanceMock.updateUserMetadata).toHaveBeenCalledWith(
        expect.objectContaining({
          hasData: true,
        })
      );
    });

    describe('getVariation', () => {
      let startContract: CloudExperimentsPluginStart;
      describe('with the client created', () => {
        beforeEach(() => {
          plugin.setup(coreMock.createSetup(), {
            cloud: { ...cloudMock.createSetup(), isCloudEnabled: true },
          });
          startContract = plugin.start(coreMock.createStart(), {
            cloud: cloudMock.createStart(),
            dataViews: dataViewPluginMocks.createStartContract(),
          });
        });

        test('uses the flag overrides to respond early', async () => {
          await expect(startContract.getVariation(firstKnownFlag, 123)).resolves.toStrictEqual(
            '1234'
          );
        });

        test('calls the client', async () => {
          launchDarklyInstanceMock.getVariation.mockResolvedValue('12345');
          await expect(
            startContract.getVariation(
              // @ts-expect-error We only allow existing flags in FEATURE_FLAG_NAMES
              'some-random-flag',
              123
            )
          ).resolves.toStrictEqual('12345');
          expect(launchDarklyInstanceMock.getVariation).toHaveBeenCalledWith(
            undefined, // it couldn't find it in FEATURE_FLAG_NAMES
            123
          );
        });
      });

      describe('with the client not created', () => {
        beforeEach(() => {
          const initializerContext = coreMock.createPluginInitializerContext({
            flag_overrides: { [firstKnownFlag]: '1234' },
            metadata_refresh_interval: duration(1, 'h'),
          });
          const customPlugin = new CloudExperimentsPlugin(initializerContext);
          customPlugin.setup(coreMock.createSetup(), {
            cloud: cloudMock.createSetup(),
          });
          expect(customPlugin).toHaveProperty('launchDarklyClient', undefined);
          startContract = customPlugin.start(coreMock.createStart(), {
            cloud: cloudMock.createStart(),
            dataViews: dataViewPluginMocks.createStartContract(),
          });
        });

        test('uses the flag overrides to respond early', async () => {
          await expect(startContract.getVariation(firstKnownFlag, 123)).resolves.toStrictEqual(
            '1234'
          );
        });

        test('returns the default value without calling the client', async () => {
          await expect(
            startContract.getVariation(
              // @ts-expect-error We only allow existing flags in FEATURE_FLAG_NAMES
              'some-random-flag',
              123
            )
          ).resolves.toStrictEqual(123);
          expect(launchDarklyInstanceMock.getVariation).not.toHaveBeenCalled();
        });
      });
    });

    describe('reportMetric', () => {
      let startContract: CloudExperimentsPluginStart;
      describe('with the client created', () => {
        beforeEach(() => {
          plugin.setup(coreMock.createSetup(), {
            cloud: { ...cloudMock.createSetup(), isCloudEnabled: true },
          });
          startContract = plugin.start(coreMock.createStart(), {
            cloud: cloudMock.createStart(),
            dataViews: dataViewPluginMocks.createStartContract(),
          });
        });

        test('calls the track API', () => {
          startContract.reportMetric({
            // @ts-expect-error We only allow existing flags in METRIC_NAMES
            name: 'my-flag',
            meta: {},
            value: 1,
          });
          expect(launchDarklyInstanceMock.reportMetric).toHaveBeenCalledWith(
            undefined, // it couldn't find it in METRIC_NAMES
            {},
            1
          );
        });
      });

      describe('with the client not created', () => {
        beforeEach(() => {
          const initializerContext = coreMock.createPluginInitializerContext({
            flag_overrides: { [firstKnownFlag]: '1234' },
            metadata_refresh_interval: duration(1, 'h'),
          });
          const customPlugin = new CloudExperimentsPlugin(initializerContext);
          customPlugin.setup(coreMock.createSetup(), {
            cloud: cloudMock.createSetup(),
          });
          expect(customPlugin).toHaveProperty('launchDarklyClient', undefined);
          startContract = customPlugin.start(coreMock.createStart(), {
            cloud: cloudMock.createStart(),
            dataViews: dataViewPluginMocks.createStartContract(),
          });
        });

        test('calls the track API', () => {
          startContract.reportMetric({
            // @ts-expect-error We only allow existing flags in METRIC_NAMES
            name: 'my-flag',
            meta: {},
            value: 1,
          });
          expect(launchDarklyInstanceMock.reportMetric).not.toHaveBeenCalled();
        });
      });
    });
  });

  describe('stop', () => {
    let plugin: CloudExperimentsPlugin;
    let launchDarklyInstanceMock: jest.Mocked<LaunchDarklyClient>;

    beforeEach(() => {
      const initializerContext = coreMock.createPluginInitializerContext({
        launch_darkly: { client_id: '1234' },
        flag_overrides: { my_flag: '1234' },
        metadata_refresh_interval: duration(1, 'h'),
      });
      plugin = new CloudExperimentsPlugin(initializerContext);
      launchDarklyInstanceMock = getLaunchDarklyClientInstanceMock();
      plugin.setup(coreMock.createSetup(), {
        cloud: { ...cloudMock.createSetup(), isCloudEnabled: true },
      });
      plugin.start(coreMock.createStart(), {
        cloud: cloudMock.createStart(),
        dataViews: dataViewPluginMocks.createStartContract(),
      });
    });

    test('flushes the events on stop', () => {
      expect(() => plugin.stop()).not.toThrow();
      expect(launchDarklyInstanceMock.stop).toHaveBeenCalledTimes(1);
    });
  });
});
