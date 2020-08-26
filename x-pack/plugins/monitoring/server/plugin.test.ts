/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Plugin } from './plugin';
import { combineLatest } from 'rxjs';
// @ts-ignore
import { initBulkUploader } from './kibana_monitoring';
import { AlertsFactory } from './alerts';

jest.mock('rxjs', () => ({
  // @ts-ignore
  ...jest.requireActual('rxjs'),
  combineLatest: jest.fn(),
}));

jest.mock('./es_client/instantiate_client', () => ({
  instantiateClient: jest.fn(),
}));

jest.mock('./license_service', () => ({
  LicenseService: jest.fn().mockImplementation(() => ({
    setup: jest.fn().mockImplementation(() => ({
      refresh: jest.fn(),
    })),
  })),
}));

jest.mock('./kibana_monitoring', () => ({
  initBulkUploader: jest.fn(),
}));

describe('Monitoring plugin', () => {
  const initializerContext = {
    logger: {
      get: jest.fn().mockImplementation(() => ({
        info: jest.fn(),
      })),
    },
    config: {
      create: jest.fn().mockImplementation(() => ({
        pipe: jest.fn().mockImplementation(() => ({
          toPromise: jest.fn(),
        })),
      })),
      legacy: {
        globalConfig$: {},
      },
    },
    env: {
      packageInfo: {
        version: '1.0.0',
      },
    },
  };

  const coreSetup = {
    http: {
      createRouter: jest.fn(),
      getServerInfo: jest.fn().mockImplementation(() => ({
        port: 5601,
      })),
      basePath: {
        serverBasePath: '',
      },
    },
    elasticsearch: {
      legacy: {
        client: {},
        createClient: jest.fn(),
      },
    },
  };

  const setupPlugins = {
    usageCollection: {
      getCollectorByType: jest.fn(),
      makeStatsCollector: jest.fn(),
      registerCollector: jest.fn(),
    },
    alerts: {
      registerType: jest.fn(),
    },
  };

  let config = {};
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

  beforeEach(() => {
    config = defaultConfig;
    (combineLatest as jest.Mock).mockImplementation(() => {
      return {
        pipe: jest.fn().mockImplementation(() => {
          return {
            toPromise: jest.fn().mockImplementation(() => {
              return [config, 2];
            }),
          };
        }),
      };
    });
  });

  afterEach(() => {
    (setupPlugins.alerts.registerType as jest.Mock).mockReset();
  });

  it('always create the bulk uploader', async () => {
    const setKibanaStatusGetter = jest.fn();
    (initBulkUploader as jest.Mock).mockImplementation(() => {
      return {
        setKibanaStatusGetter,
      };
    });
    const plugin = new Plugin(initializerContext as any);
    const contract = await plugin.setup(coreSetup as any, setupPlugins as any);
    contract.registerLegacyAPI(null as any);
    expect(setKibanaStatusGetter).toHaveBeenCalled();
  });

  it('should register all alerts', async () => {
    const alerts = AlertsFactory.getAll();
    const plugin = new Plugin(initializerContext as any);
    await plugin.setup(coreSetup as any, setupPlugins as any);
    expect(setupPlugins.alerts.registerType).toHaveBeenCalledTimes(alerts.length);
  });
});
