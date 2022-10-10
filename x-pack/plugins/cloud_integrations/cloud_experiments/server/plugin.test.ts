/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { cloudMock } from '@kbn/cloud-plugin/server/mocks';
import { usageCollectionPluginMock } from '@kbn/usage-collection-plugin/server/mocks';
import { ldClientMock } from './plugin.test.mock';
import { CloudExperimentsPlugin } from './plugin';
import { FEATURE_FLAG_NAMES } from '../common/constants';

describe('Cloud Experiments server plugin', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  const ldUser = {
    key: '1c2412b751f056aef6e340efa5637d137442d489a4b1e3117071e7c87f8523f2',
    custom: {
      kibanaVersion: coreMock.createPluginInitializerContext().env.packageInfo.version,
    },
  };

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
      ldClientMock.waitForInitialization.mockResolvedValue(ldClientMock);
      const plugin = new CloudExperimentsPlugin(initializerContext);
      expect(plugin).toHaveProperty('launchDarklyClient', ldClientMock);
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
      const initializerContext = coreMock.createPluginInitializerContext({
        launch_darkly: { sdk_key: 'sdk-1234' },
        flag_overrides: { my_flag: '1234' },
      });
      ldClientMock.waitForInitialization.mockResolvedValue(ldClientMock);
      plugin = new CloudExperimentsPlugin(initializerContext);
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

    describe('identifyUser', () => {
      test('sets launchDarklyUser and calls identify', () => {
        expect(plugin).toHaveProperty('launchDarklyUser', undefined);
        plugin.setup(coreMock.createSetup(), {
          cloud: { ...cloudMock.createSetup(), isCloudEnabled: true },
        });
        expect(plugin).toHaveProperty('launchDarklyUser', ldUser);
        expect(ldClientMock.identify).toHaveBeenCalledWith(ldUser);
      });
    });
  });

  describe('start', () => {
    let plugin: CloudExperimentsPlugin;

    const firstKnownFlag = Object.keys(FEATURE_FLAG_NAMES)[0] as keyof typeof FEATURE_FLAG_NAMES;

    beforeEach(() => {
      const initializerContext = coreMock.createPluginInitializerContext({
        launch_darkly: { sdk_key: 'sdk-1234' },
        flag_overrides: { [firstKnownFlag]: '1234' },
      });
      ldClientMock.waitForInitialization.mockResolvedValue(ldClientMock);
      plugin = new CloudExperimentsPlugin(initializerContext);
    });

    test('returns the contract', () => {
      plugin.setup(coreMock.createSetup(), { cloud: cloudMock.createSetup() });
      const startContract = plugin.start(coreMock.createStart());
      expect(startContract).toStrictEqual(
        expect.objectContaining({
          getVariation: expect.any(Function),
          reportMetric: expect.any(Function),
        })
      );
    });

    describe('getVariation', () => {
      describe('with the user identified', () => {
        beforeEach(() => {
          plugin.setup(coreMock.createSetup(), {
            cloud: { ...cloudMock.createSetup(), isCloudEnabled: true },
          });
        });

        test('uses the flag overrides to respond early', async () => {
          const startContract = plugin.start(coreMock.createStart());
          await expect(startContract.getVariation(firstKnownFlag, 123)).resolves.toStrictEqual(
            '1234'
          );
        });

        test('calls the client', async () => {
          const startContract = plugin.start(coreMock.createStart());
          ldClientMock.variation.mockResolvedValue('12345');
          await expect(
            startContract.getVariation(
              // @ts-expect-error We only allow existing flags in FEATURE_FLAG_NAMES
              'some-random-flag',
              123
            )
          ).resolves.toStrictEqual('12345');
          expect(ldClientMock.variation).toHaveBeenCalledWith(
            undefined, // it couldn't find it in FEATURE_FLAG_NAMES
            ldUser,
            123
          );
        });
      });

      describe('with the user not identified', () => {
        beforeEach(() => {
          plugin.setup(coreMock.createSetup(), {
            cloud: { ...cloudMock.createSetup(), isCloudEnabled: false },
          });
        });

        test('uses the flag overrides to respond early', async () => {
          const startContract = plugin.start(coreMock.createStart());
          await expect(startContract.getVariation(firstKnownFlag, 123)).resolves.toStrictEqual(
            '1234'
          );
        });

        test('returns the default value without calling the client', async () => {
          const startContract = plugin.start(coreMock.createStart());
          await expect(
            startContract.getVariation(
              // @ts-expect-error We only allow existing flags in FEATURE_FLAG_NAMES
              'some-random-flag',
              123
            )
          ).resolves.toStrictEqual(123);
          expect(ldClientMock.variation).not.toHaveBeenCalled();
        });
      });
    });

    describe('reportMetric', () => {
      describe('with the user identified', () => {
        beforeEach(() => {
          plugin.setup(coreMock.createSetup(), {
            cloud: { ...cloudMock.createSetup(), isCloudEnabled: true },
          });
        });

        test('calls the track API', () => {
          const startContract = plugin.start(coreMock.createStart());
          startContract.reportMetric({
            // @ts-expect-error We only allow existing flags in METRIC_NAMES
            name: 'my-flag',
            meta: {},
            value: 1,
          });
          expect(ldClientMock.track).toHaveBeenCalledWith(
            undefined, // it couldn't find it in METRIC_NAMES
            ldUser,
            {},
            1
          );
        });
      });

      describe('with the user not identified', () => {
        beforeEach(() => {
          plugin.setup(coreMock.createSetup(), {
            cloud: { ...cloudMock.createSetup(), isCloudEnabled: false },
          });
        });

        test('calls the track API', () => {
          const startContract = plugin.start(coreMock.createStart());
          startContract.reportMetric({
            // @ts-expect-error We only allow existing flags in METRIC_NAMES
            name: 'my-flag',
            meta: {},
            value: 1,
          });
          expect(ldClientMock.track).not.toHaveBeenCalled();
        });
      });
    });
  });

  describe('stop', () => {
    let plugin: CloudExperimentsPlugin;

    beforeEach(() => {
      const initializerContext = coreMock.createPluginInitializerContext({
        launch_darkly: { sdk_key: 'sdk-1234' },
        flag_overrides: { my_flag: '1234' },
      });
      ldClientMock.waitForInitialization.mockResolvedValue(ldClientMock);
      plugin = new CloudExperimentsPlugin(initializerContext);
      plugin.setup(coreMock.createSetup(), {
        cloud: { ...cloudMock.createSetup(), isCloudEnabled: true },
      });
      plugin.start(coreMock.createStart());
    });

    test('flushes the events', () => {
      ldClientMock.flush.mockResolvedValue();
      expect(() => plugin.stop()).not.toThrow();
      expect(ldClientMock.flush).toHaveBeenCalledTimes(1);
    });

    test('handles errors when flushing events', () => {
      ldClientMock.flush.mockRejectedValue(new Error('Something went terribly wrong'));
      expect(() => plugin.stop()).not.toThrow();
      expect(ldClientMock.flush).toHaveBeenCalledTimes(1);
    });
  });
});
