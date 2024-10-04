/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

describe('Cloud Experiments server plugin', () => {
  jest.useFakeTimers();

  afterEach(() => {
    jest.clearAllTimers();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('successfully creates a new when in dev mode plugin if provided an empty configuration', () => {
      const initializerContext = coreMock.createPluginInitializerContext();
      initializerContext.env.mode.dev = true; // ensure it's true
      const plugin = new CloudExperimentsPlugin(initializerContext);
      expect(plugin).toHaveProperty('setup');
      expect(plugin).toHaveProperty('start');
      expect(plugin).toHaveProperty('stop');
    });

    test('fails if launch_darkly is not provided in the config and it is a non-dev environment', () => {
      const initializerContext = coreMock.createPluginInitializerContext();
      initializerContext.env.mode.dev = false;
      expect(() => new CloudExperimentsPlugin(initializerContext)).toThrowError(
        'xpack.cloud_integrations.experiments.launch_darkly configuration should exist'
      );
    });
  });

  describe('setup', () => {
    let plugin: CloudExperimentsPlugin;

    beforeEach(() => {
      const initializerContext = coreMock.createPluginInitializerContext(
        config.schema.validate(
          {
            launch_darkly: { sdk_key: 'sdk-1234', client_id: 'fake-client-id' },
          },
          { dev: true }
        )
      );
      plugin = new CloudExperimentsPlugin(initializerContext);
    });

    afterEach(() => {
      plugin.stop();
    });

    test('registers the usage collector when available', () => {
      const usageCollection = usageCollectionPluginMock.createSetupContract();
      expect(
        plugin.setup(coreMock.createSetup(), {
          cloud: cloudMock.createSetup(),
          usageCollection,
        })
      ).toBeUndefined();
      expect(usageCollection.makeUsageCollector).toHaveBeenCalledTimes(1);
      expect(usageCollection.registerCollector).toHaveBeenCalledTimes(1);
    });

    test('updates the user metadata on setup', async () => {
      const coreSetupMock = coreMock.createSetup();
      plugin.setup(coreSetupMock, {
        cloud: { ...cloudMock.createSetup(), isCloudEnabled: true },
        usageCollection: usageCollectionPluginMock.createSetupContract(),
      });

      const initializerContext = coreMock.createPluginInitializerContext();

      await jest.advanceTimersByTimeAsync(100); // Remove the debounceTime effect
      expect(coreSetupMock.featureFlags.appendContext).toHaveBeenCalledWith({
        kind: 'multi',
        kibana: {
          key: 'deployment-id',
          offering: 'traditional',
          version: initializerContext.env.packageInfo.version,
          build_num: initializerContext.env.packageInfo.buildNum,
          build_sha: initializerContext.env.packageInfo.buildSha,
          build_sha_short: initializerContext.env.packageInfo.buildShaShort,
        },
        organization: {
          key: 'organization-id',
          trial_end_date: expect.any(Date),
          in_trial: false,
          is_elastic_staff: true,
        },
      });
    });
  });

  describe('start', () => {
    let plugin: CloudExperimentsPlugin;
    let dataViews: jest.Mocked<DataViewsServerPluginStart>;

    beforeEach(() => {
      const initializerContext = coreMock.createPluginInitializerContext(
        config.schema.validate(
          {
            launch_darkly: { sdk_key: 'sdk-1234', client_id: 'fake-client-id' },
          },
          { dev: true }
        )
      );
      plugin = new CloudExperimentsPlugin(initializerContext);
      dataViews = createIndexPatternsStartMock();
    });

    afterEach(() => {
      plugin.stop();
    });

    test('returns the contract', () => {
      plugin.setup(coreMock.createSetup(), {
        cloud: cloudMock.createSetup(),
        usageCollection: usageCollectionPluginMock.createSetupContract(),
      });
      expect(plugin.start(coreMock.createStart(), { dataViews })).toBeUndefined();
    });

    test('triggers a userMetadataUpdate for `hasData`', async () => {
      const coreSetup = coreMock.createSetup();
      plugin.setup(coreSetup, {
        cloud: { ...cloudMock.createSetup(), isCloudEnabled: true },
        usageCollection: usageCollectionPluginMock.createSetupContract(),
      });
      dataViews.dataViewsServiceFactory.mockResolvedValue(dataViewsService);
      dataViewsService.hasUserDataView.mockResolvedValue(true);
      plugin.start(coreMock.createStart(), { dataViews });

      // After scheduler kicks in...
      await jest.advanceTimersByTimeAsync(100);
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
      const initializerContext = coreMock.createPluginInitializerContext(
        config.schema.validate(
          {
            launch_darkly: { sdk_key: 'sdk-1234', client_id: 'fake-client-id' },
          },
          { dev: true }
        )
      );
      plugin = new CloudExperimentsPlugin(initializerContext);
      const dataViews = createIndexPatternsStartMock();
      plugin.setup(coreMock.createSetup(), {
        cloud: { ...cloudMock.createSetup(), isCloudEnabled: true },
        usageCollection: usageCollectionPluginMock.createSetupContract(),
      });
      plugin.start(coreMock.createStart(), { dataViews });
    });

    test('stops the Metadata Service', () => {
      // eslint-disable-next-line dot-notation
      const metadataServiceStopSpy = jest.spyOn(plugin['metadataService'], 'stop');
      plugin.stop();
      expect(metadataServiceStopSpy).toHaveBeenCalledTimes(1);
    });
  });
});
