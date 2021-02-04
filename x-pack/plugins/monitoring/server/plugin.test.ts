/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from 'src/core/server/mocks';
import { Plugin } from './plugin';
import { combineLatest } from 'rxjs';
import { AlertsFactory } from './alerts';

jest.mock('rxjs', () => ({
  // @ts-ignore
  ...jest.requireActual('rxjs'),
  combineLatest: jest.fn(),
}));

jest.mock('./es_client/instantiate_client', () => ({
  instantiateClient: jest.fn().mockImplementation(() => ({
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

  const coreSetup = coreMock.createSetup();
  coreSetup.http.getServerInfo.mockReturnValue({ port: 5601 } as any);
  coreSetup.status.overall$.subscribe = jest.fn();

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
    (coreSetup.status.overall$.subscribe as jest.Mock).mockReset();
  });

  it('always create the bulk uploader', async () => {
    const plugin = new Plugin(initializerContext as any);
    await plugin.setup(coreSetup, setupPlugins as any);
    expect(coreSetup.status.overall$.subscribe).toHaveBeenCalled();
  });

  it('should register all alerts', async () => {
    const alerts = AlertsFactory.getAll();
    const plugin = new Plugin(initializerContext as any);
    await plugin.setup(coreSetup as any, setupPlugins as any);
    expect(setupPlugins.alerts.registerType).toHaveBeenCalledTimes(alerts.length);
  });
});
