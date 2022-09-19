/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { ldClientMock } from './plugin.test.mock';
import { CloudExperimentsPlugin } from './plugin';
import { FEATURE_FLAG_NAMES } from '../common/constants';

describe('Cloud Experiments public plugin', () => {
  jest.spyOn(console, 'debug').mockImplementation(); // silence console.debug logs

  beforeEach(() => {
    jest.resetAllMocks();
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
  });

  describe('setup', () => {
    let plugin: CloudExperimentsPlugin;

    beforeEach(() => {
      const initializerContext = coreMock.createPluginInitializerContext({
        launch_darkly: { client_id: '1234' },
        flag_overrides: { my_flag: '1234' },
      });
      plugin = new CloudExperimentsPlugin(initializerContext);
    });

    test('returns the contract', () => {
      const setupContract = plugin.setup(coreMock.createSetup());
      expect(setupContract).toStrictEqual(
        expect.objectContaining({
          identifyUser: expect.any(Function),
        })
      );
    });

    describe('identifyUser', () => {
      test('it skips creating the client if no client id provided in the config', () => {
        const initializerContext = coreMock.createPluginInitializerContext({
          flag_overrides: { my_flag: '1234' },
        });
        const customPlugin = new CloudExperimentsPlugin(initializerContext);
        const setupContract = customPlugin.setup(coreMock.createSetup());
        expect(customPlugin).toHaveProperty('launchDarklyClient', undefined);
        setupContract.identifyUser('user-id', {});
        expect(customPlugin).toHaveProperty('launchDarklyClient', undefined);
      });

      test('it initializes the LaunchDarkly client', () => {
        const setupContract = plugin.setup(coreMock.createSetup());
        expect(plugin).toHaveProperty('launchDarklyClient', undefined);
        setupContract.identifyUser('user-id', {});
        expect(plugin).toHaveProperty('launchDarklyClient', ldClientMock);
        expect(ldClientMock.identify).not.toHaveBeenCalled();
      });

      test('it calls identify if the client already exists', () => {
        const setupContract = plugin.setup(coreMock.createSetup());
        expect(plugin).toHaveProperty('launchDarklyClient', undefined);
        setupContract.identifyUser('user-id', {});
        expect(plugin).toHaveProperty('launchDarklyClient', ldClientMock);
        expect(ldClientMock.identify).not.toHaveBeenCalled();
        ldClientMock.identify.mockResolvedValue({}); // ensure it's a promise
        setupContract.identifyUser('user-id', {});
        expect(ldClientMock.identify).toHaveBeenCalledTimes(1);
      });

      test('it handles identify rejections', async () => {
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
        const setupContract = plugin.setup(coreMock.createSetup());
        expect(plugin).toHaveProperty('launchDarklyClient', undefined);
        setupContract.identifyUser('user-id', {});
        expect(plugin).toHaveProperty('launchDarklyClient', ldClientMock);
        expect(ldClientMock.identify).not.toHaveBeenCalled();
        const error = new Error('Something went terribly wrong');
        ldClientMock.identify.mockRejectedValue(error);
        setupContract.identifyUser('user-id', {});
        expect(ldClientMock.identify).toHaveBeenCalledTimes(1);
        await new Promise((resolve) => process.nextTick(resolve));
        expect(consoleWarnSpy).toHaveBeenCalledWith(error);
      });
    });
  });

  describe('start', () => {
    let plugin: CloudExperimentsPlugin;

    const firstKnownFlag = Object.keys(FEATURE_FLAG_NAMES)[0] as keyof typeof FEATURE_FLAG_NAMES;

    beforeEach(() => {
      const initializerContext = coreMock.createPluginInitializerContext({
        launch_darkly: { client_id: '1234' },
        flag_overrides: { [firstKnownFlag]: '1234' },
      });
      plugin = new CloudExperimentsPlugin(initializerContext);
    });

    test('returns the contract', () => {
      plugin.setup(coreMock.createSetup());
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
          const setupContract = plugin.setup(coreMock.createSetup());
          setupContract.identifyUser('user-id', {});
        });

        test('uses the flag overrides to respond early', async () => {
          const startContract = plugin.start(coreMock.createStart());
          await expect(startContract.getVariation(firstKnownFlag, 123)).resolves.toStrictEqual(
            '1234'
          );
        });

        test('calls the client', async () => {
          const startContract = plugin.start(coreMock.createStart());
          ldClientMock.variation.mockReturnValue('12345');
          await expect(
            startContract.getVariation(
              // @ts-expect-error We only allow existing flags in FEATURE_FLAG_NAMES
              'some-random-flag',
              123
            )
          ).resolves.toStrictEqual('12345');
          expect(ldClientMock.variation).toHaveBeenCalledWith(
            undefined, // it couldn't find it in FEATURE_FLAG_NAMES
            123
          );
        });
      });

      describe('with the user not identified', () => {
        beforeEach(() => {
          plugin.setup(coreMock.createSetup());
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
          const setupContract = plugin.setup(coreMock.createSetup());
          setupContract.identifyUser('user-id', {});
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
            {},
            1
          );
        });
      });

      describe('with the user not identified', () => {
        beforeEach(() => {
          plugin.setup(coreMock.createSetup());
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
        launch_darkly: { client_id: '1234' },
        flag_overrides: { my_flag: '1234' },
      });
      plugin = new CloudExperimentsPlugin(initializerContext);
      const setupContract = plugin.setup(coreMock.createSetup());
      setupContract.identifyUser('user-id', {});
      plugin.start(coreMock.createStart());
    });

    test('flushes the events on stop', () => {
      ldClientMock.flush.mockResolvedValue();
      expect(() => plugin.stop()).not.toThrow();
      expect(ldClientMock.flush).toHaveBeenCalledTimes(1);
    });

    test('handles errors when flushing events', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const error = new Error('Something went terribly wrong');
      ldClientMock.flush.mockRejectedValue(error);
      expect(() => plugin.stop()).not.toThrow();
      expect(ldClientMock.flush).toHaveBeenCalledTimes(1);
      await new Promise((resolve) => process.nextTick(resolve));
      expect(consoleWarnSpy).toHaveBeenCalledWith(error);
    });
  });
});
