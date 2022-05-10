/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerDataHandler, getDataHandler } from './data_handler';
import moment from 'moment';
import { ApmIndicesConfig } from '../common/typings';

const sampleAPMIndices = { transaction: 'apm-*' } as ApmIndicesConfig;

const params = {
  absoluteTime: {
    start: moment('2020-07-02T13:25:11.629Z').valueOf(),
    end: moment('2020-07-09T13:25:11.629Z').valueOf(),
  },
  relativeTime: {
    start: 'now-15m',
    end: 'now',
  },
  intervalString: '10s',
  bucketSize: 10,
};

describe('registerDataHandler', () => {
  const originalConsole = global.console;
  beforeAll(() => {
    // mocks console to avoid polluting the test output
    global.console = { error: jest.fn() } as unknown as typeof console;
  });

  afterAll(() => {
    global.console = originalConsole;
  });

  describe('APM', () => {
    registerDataHandler({
      appName: 'apm',
      fetchData: async () => {
        return {
          title: 'apm',
          appLink: '/apm',
          stats: {
            services: {
              label: 'services',
              type: 'number',
              value: 1,
            },
            transactions: {
              label: 'transactions',
              type: 'number',
              value: 1,
            },
          },
          series: {
            transactions: {
              label: 'transactions',
              coordinates: [{ x: 1 }],
            },
          },
        };
      },
      hasData: async () => ({ hasData: true, indices: sampleAPMIndices }),
    });

    it('registered data handler', () => {
      const dataHandler = getDataHandler('apm');
      expect(dataHandler?.fetchData).toBeDefined();
      expect(dataHandler?.hasData).toBeDefined();
    });

    it('returns data when fetchData is called', async () => {
      const dataHandler = getDataHandler('apm');
      const response = await dataHandler?.fetchData(params);
      expect(response).toEqual({
        title: 'apm',
        appLink: '/apm',
        stats: {
          services: {
            label: 'services',
            type: 'number',
            value: 1,
          },
          transactions: {
            label: 'transactions',
            type: 'number',
            value: 1,
          },
        },
        series: {
          transactions: {
            label: 'transactions',
            coordinates: [{ x: 1 }],
          },
        },
      });
    });

    it('returns true when hasData is called', async () => {
      const dataHandler = getDataHandler('apm');
      const hasData = await dataHandler?.hasData();
      expect(hasData).toBeTruthy();
    });
  });
  describe('Logs', () => {
    registerDataHandler({
      appName: 'infra_logs',
      fetchData: async () => {
        return {
          title: 'logs',
          appLink: '/logs',
          stats: {
            foo: {
              label: 'Foo',
              type: 'number',
              value: 1,
            },
            bar: {
              label: 'bar',
              type: 'number',
              value: 1,
            },
          },
          series: {
            foo: {
              label: 'Foo',
              coordinates: [{ x: 1 }],
            },
            bar: {
              label: 'Bar',
              coordinates: [{ x: 1 }],
            },
          },
        };
      },
      hasData: async () => {
        return {
          hasData: true,
          indices: 'test-index',
        };
      },
    });

    it('registered data handler', () => {
      const dataHandler = getDataHandler('infra_logs');
      expect(dataHandler?.fetchData).toBeDefined();
      expect(dataHandler?.hasData).toBeDefined();
    });

    it('returns data when fetchData is called', async () => {
      const dataHandler = getDataHandler('infra_logs');
      const response = await dataHandler?.fetchData(params);
      expect(response).toEqual({
        title: 'logs',
        appLink: '/logs',
        stats: {
          foo: {
            label: 'Foo',
            type: 'number',
            value: 1,
          },
          bar: {
            label: 'bar',
            type: 'number',
            value: 1,
          },
        },
        series: {
          foo: {
            label: 'Foo',
            coordinates: [{ x: 1 }],
          },
          bar: {
            label: 'Bar',
            coordinates: [{ x: 1 }],
          },
        },
      });
    });

    it('returns true when hasData is called', async () => {
      const dataHandler = getDataHandler('infra_logs');
      const hasData = await dataHandler?.hasData();
      expect(hasData?.hasData).toBeTruthy();
    });
  });
  describe('Uptime', () => {
    registerDataHandler({
      appName: 'synthetics',
      fetchData: async () => {
        return {
          title: 'uptime',
          appLink: '/uptime',
          stats: {
            monitors: {
              label: 'Monitors',
              type: 'number',
              value: 1,
            },
            up: {
              label: 'Up',
              type: 'number',
              value: 1,
            },
            down: {
              label: 'Down',
              type: 'number',
              value: 1,
            },
          },
          series: {
            down: {
              label: 'Down',
              coordinates: [{ x: 1 }],
            },
            up: {
              label: 'Up',
              coordinates: [{ x: 1 }],
            },
          },
        };
      },
      hasData: async () => ({ hasData: true, indices: 'heartbeat-*,synthetics-*' }),
    });

    it('registered data handler', () => {
      const dataHandler = getDataHandler('synthetics');
      expect(dataHandler?.fetchData).toBeDefined();
      expect(dataHandler?.hasData).toBeDefined();
    });

    it('returns data when fetchData is called', async () => {
      const dataHandler = getDataHandler('synthetics');
      const response = await dataHandler?.fetchData(params);
      expect(response).toEqual({
        title: 'uptime',
        appLink: '/uptime',
        stats: {
          monitors: {
            label: 'Monitors',
            type: 'number',
            value: 1,
          },
          up: {
            label: 'Up',
            type: 'number',
            value: 1,
          },
          down: {
            label: 'Down',
            type: 'number',
            value: 1,
          },
        },
        series: {
          down: {
            label: 'Down',
            coordinates: [{ x: 1 }],
          },
          up: {
            label: 'Up',
            coordinates: [{ x: 1 }],
          },
        },
      });
    });

    it('returns true when hasData is called', async () => {
      const dataHandler = getDataHandler('apm');
      const hasData = await dataHandler?.hasData();
      expect(hasData).toBeTruthy();
    });
  });
  describe('Ux', () => {
    registerDataHandler({
      appName: 'ux',
      fetchData: async () => {
        return {
          title: 'User Experience',
          appLink: '/ux',
          coreWebVitals: {
            cls: 0.01,
            fid: 5,
            lcp: 1464.3333333333333,
            tbt: 232.92166666666665,
            fcp: 1154.8,
            coreVitalPages: 100,
            lcpRanks: [73, 16, 11],
            fidRanks: [85, 4, 11],
            clsRanks: [88, 7, 5],
          },
        };
      },
      hasData: async () => ({
        hasData: true,
        serviceName: 'elastic-co-frontend',
        indices: 'apm-*',
      }),
    });

    it('registered data handler', () => {
      const dataHandler = getDataHandler('ux');
      expect(dataHandler?.fetchData).toBeDefined();
      expect(dataHandler?.hasData).toBeDefined();
    });

    it('returns data when fetchData is called', async () => {
      const dataHandler = getDataHandler('ux');
      const response = await dataHandler?.fetchData(params);
      expect(response).toEqual({
        title: 'User Experience',
        appLink: '/ux',
        coreWebVitals: {
          cls: 0.01,
          fid: 5,
          lcp: 1464.3333333333333,
          tbt: 232.92166666666665,
          fcp: 1154.8,
          coreVitalPages: 100,
          lcpRanks: [73, 16, 11],
          fidRanks: [85, 4, 11],
          clsRanks: [88, 7, 5],
        },
      });
    });

    it('returns true when hasData is called', async () => {
      const dataHandler = getDataHandler('ux');
      const hasData = await dataHandler?.hasData();
      expect(hasData).toBeTruthy();
    });
  });

  describe('Metrics', () => {
    const makeRequestResponse = {
      title: 'metrics',
      appLink: '/metrics',
      sort: () => makeRequest(),
      series: [],
    };
    const makeRequest = async () => {
      return makeRequestResponse;
    };
    registerDataHandler({
      appName: 'infra_metrics',
      fetchData: makeRequest,
      hasData: async () => ({ hasData: true, indices: 'metrics-*' }),
    });

    it('registered data handler', () => {
      const dataHandler = getDataHandler('infra_metrics');
      expect(dataHandler?.fetchData).toBeDefined();
      expect(dataHandler?.hasData).toBeDefined();
    });

    it('returns data when fetchData is called', async () => {
      const dataHandler = getDataHandler('infra_metrics');
      const response = await dataHandler?.fetchData(params);
      expect(response).toEqual(makeRequestResponse);
    });

    it('returns true when hasData is called', async () => {
      const dataHandler = getDataHandler('apm');
      const hasData = await dataHandler?.hasData();
      expect(hasData).toBeTruthy();
    });
  });
});
