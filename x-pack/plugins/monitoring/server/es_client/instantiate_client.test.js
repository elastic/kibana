/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { instantiateClient, hasMonitoringCluster } from './instantiate_client';

const server = {
  monitoring: {
    ui: {
      elasticsearch: {
        hosts: [],
        username: 'monitoring-user-internal-test',
        password: 'monitoring-p@ssw0rd!-internal-test',
        ssl: {},
        customHeaders: {
          'x-custom-headers-test': 'connection-monitoring',
        },
      },
    },
  },
};
const serverWithUrl = {
  monitoring: {
    ui: {
      elasticsearch: {
        hosts: ['http://monitoring-cluster.test:9200'],
        username: 'monitoring-user-internal-test',
        password: 'monitoring-p@ssw0rd!-internal-test',
        ssl: {},
        customHeaders: {
          'x-custom-headers-test': 'connection-monitoring',
        },
      },
    },
  },
};

const createClient = jest.fn();
const log = { info: jest.fn() };

describe('Instantiate Client', () => {
  afterEach(() => {
    createClient.mockReset();
    log.info.mockReset();
  });

  describe('Logging', () => {
    it('logs that the config was sourced from the production options', () => {
      instantiateClient(server.monitoring.ui.elasticsearch, log, createClient);

      expect(log.info.mock.calls[0]).toEqual(['config sourced from: production cluster']);
    });

    it('logs that the config was sourced from the monitoring options', () => {
      instantiateClient(serverWithUrl.monitoring.ui.elasticsearch, log, createClient);

      expect(log.info.mock.calls[0]).toEqual(['config sourced from: monitoring cluster']);
    });
  });

  describe('Custom Headers Configuration', () => {
    it('Does not add xpack.monitoring.elasticsearch.customHeaders if connected to production cluster', () => {
      instantiateClient(server.monitoring.ui.elasticsearch, log, createClient);

      const createClusterCall = createClient.mock.calls[0];
      expect(createClient).toHaveBeenCalledTimes(1);
      expect(createClusterCall[0]).toBe('monitoring');
      expect(createClusterCall[1].customHeaders).toEqual(undefined);
    });

    it('Adds xpack.monitoring.elasticsearch.customHeaders if connected to monitoring cluster', () => {
      instantiateClient(serverWithUrl.monitoring.ui.elasticsearch, log, createClient);

      const createClusterCall = createClient.mock.calls[0];

      expect(createClient).toHaveBeenCalledTimes(1);
      expect(createClusterCall[0]).toBe('monitoring');
      expect(createClusterCall[1].customHeaders).toEqual({
        'x-custom-headers-test': 'connection-monitoring',
      });
    });
  });

  describe('Use a connection to production cluster', () => {
    it('exposes an authenticated client using production host settings', () => {
      instantiateClient(server.monitoring.ui.elasticsearch, log, createClient);

      const createClusterCall = createClient.mock.calls[0];
      const createClientOptions = createClusterCall[1];

      expect(createClient).toHaveBeenCalledTimes(1);
      expect(createClusterCall[0]).toBe('monitoring');
      expect(createClientOptions.hosts).toEqual(undefined);
    });
  });

  describe('Use a connection to monitoring cluster', () => {
    it('exposes an authenticated client using monitoring host settings', () => {
      instantiateClient(serverWithUrl.monitoring.ui.elasticsearch, log, createClient);
      const createClusterCall = createClient.mock.calls[0];
      const createClientOptions = createClusterCall[1];

      expect(createClient).toHaveBeenCalledTimes(1);
      expect(createClusterCall[0]).toBe('monitoring');
      expect(createClientOptions.hosts[0]).toEqual('http://monitoring-cluster.test:9200');
      expect(createClientOptions.username).toEqual('monitoring-user-internal-test');
      expect(createClientOptions.password).toEqual('monitoring-p@ssw0rd!-internal-test');
    });
  });

  describe('hasMonitoringCluster', () => {
    it('returns true if monitoring is configured', () => {
      expect(hasMonitoringCluster(serverWithUrl.monitoring.ui.elasticsearch)).toBe(true);
    });

    it('returns false if monitoring is not configured', () => {
      expect(hasMonitoringCluster(server.monitoring.ui.elasticsearch)).toBe(false);
    });
  });
});
