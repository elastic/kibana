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
import { CloudExperimentsPlugin } from './plugin';
import { MetadataService } from '../common/metadata_service';

describe('Cloud Experiments public plugin', () => {
  jest.spyOn(console, 'debug').mockImplementation(); // silence console.debug logs

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('successfully creates a new plugin if provided an empty configuration', () => {
      const initializerContext = coreMock.createPluginInitializerContext();
      initializerContext.env.mode = {
        name: 'development',
        dev: true, // ensure it's true
        prod: false,
      };
      const plugin = new CloudExperimentsPlugin(initializerContext);
      expect(plugin).toHaveProperty('setup');
      expect(plugin).toHaveProperty('start');
      expect(plugin).toHaveProperty('stop');
      expect(plugin).toHaveProperty('metadataService', expect.any(MetadataService));
    });

    test('fails if launch_darkly is not provided in the config and it is a non-dev environment', () => {
      const initializerContext = coreMock.createPluginInitializerContext();
      initializerContext.env.mode = {
        name: 'production',
        dev: false,
        prod: true, // ensure it's true
      };
      expect(() => new CloudExperimentsPlugin(initializerContext)).toThrowError(
        'xpack.cloud_integrations.experiments.launch_darkly configuration should exist'
      );
    });
  });

  describe('setup', () => {
    let plugin: CloudExperimentsPlugin;

    beforeEach(() => {
      const initializerContext = coreMock.createPluginInitializerContext({
        launch_darkly: { client_id: '1234' },
        metadata_refresh_interval: duration(1, 'h'),
      });
      plugin = new CloudExperimentsPlugin(initializerContext);
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
  });

  describe('start', () => {
    let plugin: CloudExperimentsPlugin;

    beforeEach(() => {
      const initializerContext = coreMock.createPluginInitializerContext({
        launch_darkly: { client_id: '1234' },
      });
      plugin = new CloudExperimentsPlugin(initializerContext);
    });

    afterEach(() => {
      plugin.stop();
    });

    test('returns the contract', () => {
      plugin.setup(coreMock.createSetup(), { cloud: cloudMock.createSetup() });
      const startContract = plugin.start(coreMock.createStart(), {
        dataViews: dataViewPluginMocks.createStartContract(),
      });
      expect(startContract).toBeUndefined();
    });

    test('updates the context with `has_data`', async () => {
      const coreSetup = coreMock.createSetup();
      plugin.setup(coreSetup, {
        cloud: { ...cloudMock.createSetup(), isCloudEnabled: true },
      });

      const dataViews = dataViewPluginMocks.createStartContract();
      plugin.start(coreMock.createStart(), { dataViews });

      // After scheduler kicks in...
      await new Promise((resolve) => setTimeout(resolve, 200));
      expect(coreSetup.featureFlags.appendContext).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: 'multi',
          kibana: expect.objectContaining({
            has_data: true,
          }),
        })
      );
    });
  });

  describe('stop', () => {
    let plugin: CloudExperimentsPlugin;

    beforeEach(() => {
      const initializerContext = coreMock.createPluginInitializerContext({
        launch_darkly: { client_id: '1234' },
        flag_overrides: { my_flag: '1234' },
        metadata_refresh_interval: duration(1, 'h'),
      });
      plugin = new CloudExperimentsPlugin(initializerContext);
      plugin.setup(coreMock.createSetup(), {
        cloud: { ...cloudMock.createSetup(), isCloudEnabled: true },
      });
      plugin.start(coreMock.createStart(), {
        dataViews: dataViewPluginMocks.createStartContract(),
      });
    });

    test('flushes the events on stop', () => {
      // eslint-disable-next-line dot-notation
      const metadataServiceStopSpy = jest.spyOn(plugin['metadataService'], 'stop');
      expect(() => plugin.stop()).not.toThrow();
      expect(metadataServiceStopSpy).toHaveBeenCalledTimes(1);
    });
  });
});
