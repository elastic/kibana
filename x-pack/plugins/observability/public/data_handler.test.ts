/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { registerDataHandler, getDataHandler } from './data_handler';

const params = {
  startTime: '0',
  endTime: '1',
  bucketSize: '10s',
};

describe('registerDataHandler', () => {
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
      hasData: async () => true,
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
      hasData: async () => true,
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
      const dataHandler = getDataHandler('apm');
      const hasData = await dataHandler?.hasData();
      expect(hasData).toBeTruthy();
    });
  });
  describe('Uptime', () => {
    registerDataHandler({
      appName: 'uptime',
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
      hasData: async () => true,
    });

    it('registered data handler', () => {
      const dataHandler = getDataHandler('uptime');
      expect(dataHandler?.fetchData).toBeDefined();
      expect(dataHandler?.hasData).toBeDefined();
    });

    it('returns data when fetchData is called', async () => {
      const dataHandler = getDataHandler('uptime');
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
  describe('Metrics', () => {
    registerDataHandler({
      appName: 'infra_metrics',
      fetchData: async () => {
        return {
          title: 'metrics',
          appLink: '/metrics',
          stats: {
            hosts: {
              label: 'hosts',
              type: 'number',
              value: 1,
            },
            cpu: {
              label: 'cpu',
              type: 'number',
              value: 1,
            },
            memory: {
              label: 'memory',
              type: 'number',
              value: 1,
            },
            disk: {
              label: 'disk',
              type: 'number',
              value: 1,
            },
            inboundTraffic: {
              label: 'inboundTraffic',
              type: 'number',
              value: 1,
            },
            outboundTraffic: {
              label: 'outboundTraffic',
              type: 'number',
              value: 1,
            },
          },
          series: {
            inboundTraffic: {
              label: 'inbound Traffic',
              coordinates: [{ x: 1 }],
            },
            outboundTraffic: {
              label: 'outbound Traffic',
              coordinates: [{ x: 1 }],
            },
          },
        };
      },
      hasData: async () => true,
    });

    it('registered data handler', () => {
      const dataHandler = getDataHandler('infra_metrics');
      expect(dataHandler?.fetchData).toBeDefined();
      expect(dataHandler?.hasData).toBeDefined();
    });

    it('returns data when fetchData is called', async () => {
      const dataHandler = getDataHandler('infra_metrics');
      const response = await dataHandler?.fetchData(params);
      expect(response).toEqual({
        title: 'metrics',
        appLink: '/metrics',
        stats: {
          hosts: {
            label: 'hosts',
            type: 'number',
            value: 1,
          },
          cpu: {
            label: 'cpu',
            type: 'number',
            value: 1,
          },
          memory: {
            label: 'memory',
            type: 'number',
            value: 1,
          },
          disk: {
            label: 'disk',
            type: 'number',
            value: 1,
          },
          inboundTraffic: {
            label: 'inboundTraffic',
            type: 'number',
            value: 1,
          },
          outboundTraffic: {
            label: 'outboundTraffic',
            type: 'number',
            value: 1,
          },
        },
        series: {
          inboundTraffic: {
            label: 'inbound Traffic',
            coordinates: [{ x: 1 }],
          },
          outboundTraffic: {
            label: 'outbound Traffic',
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
});
