/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fakeSchedulers } from 'rxjs-marbles/jest';
import { coreMock } from '@kbn/core/server/mocks';
import { cloudMock } from '@kbn/cloud-plugin/server/mocks';
import { usageCollectionPluginMock } from '@kbn/usage-collection-plugin/server/mocks';
import {
  createIndexPatternsStartMock,
  dataViewsService,
} from '@kbn/data-views-plugin/server/mocks';
import { DataViewsServerPluginStart } from '@kbn/data-views-plugin/server';
import { config } from './config';
import { CloudExperimentsPlugin } from './plugin';
import { FEATURE_FLAG_NAMES } from '../common/constants';
import { LaunchDarklyClient } from './launch_darkly_client';
jest.mock('./launch_darkly_client');

describe('Cloud Experiments server plugin', () => {
  jest.useFakeTimers();

  afterEach(() => {
    jest.clearAllTimers();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('successfully creates a new plugin if provided an empty configuration', () => {
      const initializerContext = coreMock.createPluginInitializerContext();
      initializerContext.env.mode.dev = true; // ensure it's true
      const plugin = new CloudExperimentsPlugin(initializerContext);
      expect(plugin).toHaveProperty('setup');
      expect(plugin).toHaveProperty('start');
      expect(plugin).toHaveProperty('stop');
      expect(plugin).toHaveProperty('flagOverrides', undefined);
      expect(plugin).toHaveProperty('launchDarklyClient', undefined);
    });

    test('fails if launch_darkly is not provided in the config and it is a non-dev environment', () => {
      const initializerContext = coreMock.createPluginInitializerContext();
      initializerContext.env.mode.dev = false;
      expect(() => new CloudExperimentsPlugin(initializerContext)).toThrowError(
        'xpack.cloud_integrations.experiments.launch_darkly configuration should exist'
      );
    });

    test('it initializes the LaunchDarkly client', () => {
      const initializerContext = coreMock.createPluginInitializerContext({
        launch_darkly: { sdk_key: 'sdk-1234' },
      });
      const plugin = new CloudExperimentsPlugin(initializerContext);
      expect(LaunchDarklyClient).toHaveBeenCalledTimes(1);
      expect(plugin).toHaveProperty('launchDarklyClient', expect.any(LaunchDarklyClient));
    });

    test('it initializes the flagOverrides property', () => {
      const initializerContext = coreMock.createPluginInitializerContext({
        flag_overrides: { my_flag: '1234' },
      });
      initializerContext.env.mode.dev = true; // ensure it's true
      const plugin = new CloudExperimentsPlugin(initializerContext);
      expect(plugin).toHaveProperty('flagOverrides', { my_flag: '1234' });
    });
  });

  describe('setup', () => {
    let plugin: CloudExperimentsPlugin;

    beforeEach(() => {
      const initializerContext = coreMock.createPluginInitializerContext(
        config.schema.validate(
          {
            launch_darkly: { sdk_key: 'sdk-1234', client_id: 'fake-client-id' },
            flag_overrides: { my_flag: '1234' },
          },
          { dev: true }
        )
      );
      plugin = new CloudExperimentsPlugin(initializerContext);
    });

    afterEach(() => {
      plugin.stop();
    });

    test('returns the contract', () => {
      expect(
        plugin.setup(coreMock.createSetup(), {
          cloud: cloudMock.createSetup(),
        })
      ).toBeUndefined();
    });

    test('registers the usage collector when available', () => {
      const usageCollection = usageCollectionPluginMock.createSetupContract();
      plugin.setup(coreMock.createSetup(), {
        cloud: cloudMock.createSetup(),
        usageCollection,
      });
      expect(usageCollection.makeUsageCollector).toHaveBeenCalledTimes(1);
      expect(usageCollection.registerCollector).toHaveBeenCalledTimes(1);
    });

    test(
      'updates the user metadata on setup',
      fakeSchedulers((advance) => {
        plugin.setup(coreMock.createSetup(), {
          cloud: { ...cloudMock.createSetup(), isCloudEnabled: true },
        });
        const launchDarklyInstanceMock = (
          LaunchDarklyClient as jest.MockedClass<typeof LaunchDarklyClient>
        ).mock.instances[0];
        advance(100); // Remove the debounceTime effect
        expect(launchDarklyInstanceMock.updateUserMetadata).toHaveBeenCalledWith({
          userId: '1c2412b751f056aef6e340efa5637d137442d489a4b1e3117071e7c87f8523f2',
          kibanaVersion: coreMock.createPluginInitializerContext().env.packageInfo.version,
          isElasticStaff: true,
          trialEndDate: expect.any(String),
        });
      })
    );
  });

  describe('start', () => {
    let plugin: CloudExperimentsPlugin;
    let dataViews: jest.Mocked<DataViewsServerPluginStart>;
    let launchDarklyInstanceMock: jest.Mocked<LaunchDarklyClient>;

    const firstKnownFlag = Object.keys(FEATURE_FLAG_NAMES)[0] as keyof typeof FEATURE_FLAG_NAMES;

    beforeEach(() => {
      jest.useRealTimers();
      const initializerContext = coreMock.createPluginInitializerContext(
        config.schema.validate(
          {
            launch_darkly: { sdk_key: 'sdk-1234', client_id: 'fake-client-id' },
            flag_overrides: { [firstKnownFlag]: '1234' },
          },
          { dev: true }
        )
      );
      plugin = new CloudExperimentsPlugin(initializerContext);
      dataViews = createIndexPatternsStartMock();
      launchDarklyInstanceMock = (LaunchDarklyClient as jest.MockedClass<typeof LaunchDarklyClient>)
        .mock.instances[0] as jest.Mocked<LaunchDarklyClient>;
    });

    afterEach(() => {
      plugin.stop();
      jest.useFakeTimers();
    });

    test('returns the contract', () => {
      plugin.setup(coreMock.createSetup(), { cloud: cloudMock.createSetup() });
      const startContract = plugin.start(coreMock.createStart(), { dataViews });
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
      dataViews.dataViewsServiceFactory.mockResolvedValue(dataViewsService);
      dataViewsService.hasUserDataView.mockResolvedValue(true);
      plugin.start(coreMock.createStart(), { dataViews });

      // After scheduler kicks in...
      await new Promise((resolve) => setTimeout(resolve, 200)); // Waiting for scheduler and debounceTime to complete (don't know why fakeScheduler didn't work here).
      expect(launchDarklyInstanceMock.updateUserMetadata).toHaveBeenCalledWith(
        expect.objectContaining({
          hasData: true,
        })
      );
    });

    describe('getVariation', () => {
      describe('with the client created', () => {
        beforeEach(() => {
          plugin.setup(coreMock.createSetup(), {
            cloud: { ...cloudMock.createSetup(), isCloudEnabled: true },
          });
        });

        test('uses the flag overrides to respond early', async () => {
          const startContract = plugin.start(coreMock.createStart(), { dataViews });
          await expect(startContract.getVariation(firstKnownFlag, 123)).resolves.toStrictEqual(
            '1234'
          );
        });

        test('calls the client', async () => {
          const startContract = plugin.start(coreMock.createStart(), { dataViews });
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

      describe('with the client not created (missing LD settings)', () => {
        beforeEach(() => {
          const initializerContext = coreMock.createPluginInitializerContext(
            config.schema.validate(
              {
                flag_overrides: { [firstKnownFlag]: '1234' },
              },
              { dev: true }
            )
          );
          plugin = new CloudExperimentsPlugin(initializerContext);
          plugin.setup(coreMock.createSetup(), {
            cloud: { ...cloudMock.createSetup(), isCloudEnabled: false },
          });
        });

        test('uses the flag overrides to respond early', async () => {
          const startContract = plugin.start(coreMock.createStart(), { dataViews });
          await expect(startContract.getVariation(firstKnownFlag, 123)).resolves.toStrictEqual(
            '1234'
          );
        });

        test('returns the default value without calling the client', async () => {
          const startContract = plugin.start(coreMock.createStart(), { dataViews });
          await expect(
            startContract.getVariation(
              // @ts-expect-error We only allow existing flags in FEATURE_FLAG_NAMES
              'some-random-flag',
              123
            )
          ).resolves.toStrictEqual(123);
        });
      });
    });

    describe('reportMetric', () => {
      describe('with the client created', () => {
        beforeEach(() => {
          plugin.setup(coreMock.createSetup(), {
            cloud: { ...cloudMock.createSetup(), isCloudEnabled: true },
          });
        });

        test('calls LaunchDarklyClient.reportMetric', () => {
          const startContract = plugin.start(coreMock.createStart(), { dataViews });
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

      describe('with the client not created (missing LD settings)', () => {
        beforeEach(() => {
          const initializerContext = coreMock.createPluginInitializerContext(
            config.schema.validate(
              {
                flag_overrides: { [firstKnownFlag]: '1234' },
              },
              { dev: true }
            )
          );
          plugin = new CloudExperimentsPlugin(initializerContext);
          plugin.setup(coreMock.createSetup(), {
            cloud: { ...cloudMock.createSetup(), isCloudEnabled: false },
          });
        });

        test('does not call LaunchDarklyClient.reportMetric because the client is not there', () => {
          const startContract = plugin.start(coreMock.createStart(), { dataViews });
          startContract.reportMetric({
            // @ts-expect-error We only allow existing flags in METRIC_NAMES
            name: 'my-flag',
            meta: {},
            value: 1,
          });
          expect(plugin).toHaveProperty('launchDarklyClient', undefined);
        });
      });
    });
  });

  describe('stop', () => {
    let plugin: CloudExperimentsPlugin;

    beforeEach(() => {
      const initializerContext = coreMock.createPluginInitializerContext(
        config.schema.validate(
          {
            launch_darkly: { sdk_key: 'sdk-1234', client_id: 'fake-client-id' },
            flag_overrides: { my_flag: '1234' },
          },
          { dev: true }
        )
      );
      plugin = new CloudExperimentsPlugin(initializerContext);
      const dataViews = createIndexPatternsStartMock();
      plugin.setup(coreMock.createSetup(), {
        cloud: { ...cloudMock.createSetup(), isCloudEnabled: true },
      });
      plugin.start(coreMock.createStart(), { dataViews });
    });

    test('stops the LaunchDarkly client', () => {
      plugin.stop();
      const launchDarklyInstanceMock = (
        LaunchDarklyClient as jest.MockedClass<typeof LaunchDarklyClient>
      ).mock.instances[0] as jest.Mocked<LaunchDarklyClient>;
      expect(launchDarklyInstanceMock.stop).toHaveBeenCalledTimes(1);
    });

    test('stops the Metadata Service', () => {
      // eslint-disable-next-line dot-notation
      const metadataServiceStopSpy = jest.spyOn(plugin['metadataService'], 'stop');
      plugin.stop();
      expect(metadataServiceStopSpy).toHaveBeenCalledTimes(1);
    });
  });
});
