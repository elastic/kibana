/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { MonitoringPlugin } from './plugin';
import { AlertsFactory } from './alerts';

jest.mock('./es_client/instantiate_client', () => ({
  instantiateClient: jest.fn().mockImplementation(() => ({
    cluster: {},
  })),
  instantiateLegacyClient: jest.fn().mockImplementation(() => ({
    cluster: {},
  })),
}));

jest.mock('./license_service', () => ({
  LicenseService: jest.fn().mockImplementation(() => ({
    setup: jest.fn().mockImplementation(() => ({})),
  })),
}));

jest.mock('./kibana_monitoring/collectors', () => ({
  registerCollectors: jest.fn(),
}));

jest.mock('./config', () => ({
  createConfig: (config: any) => config,
}));

describe('Monitoring plugin', () => {
  const coreSetup = coreMock.createSetup();
  coreSetup.http.getServerInfo.mockReturnValue({ port: 5601 } as any);

  const setupPlugins = {
    usageCollection: {
      getCollectorByType: jest.fn(),
      makeStatsCollector: jest.fn(),
      registerCollector: jest.fn(),
    },
    alerting: {
      registerType: jest.fn(),
    },
  };

  const defaultConfig = {
    ui: {
      elasticsearch: {},
    },
    kibana: {
      collection: {
        interval: 30000,
      },
    },
  };

  const initializerContext = coreMock.createPluginInitializerContext(defaultConfig);

  afterEach(() => {
    (setupPlugins.alerting.registerType as jest.Mock).mockReset();
  });

  it('always create the bulk uploader', async () => {
    const plugin = new MonitoringPlugin(initializerContext as any);
    await plugin.setup(coreSetup, setupPlugins as any);
    // eslint-disable-next-line dot-notation
    expect(plugin['bulkUploader']).not.toBeUndefined();
  });

  it('should register all alerts', async () => {
    const alerts = AlertsFactory.getAll();
    const plugin = new MonitoringPlugin(initializerContext as any);
    await plugin.setup(coreSetup as any, setupPlugins as any);
    expect(setupPlugins.alerting.registerType).toHaveBeenCalledTimes(alerts.length);
  });
});
