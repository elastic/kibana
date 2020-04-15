/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import sinon from 'sinon';
import { instantiateClient, hasMonitoringCluster } from '../instantiate_client';

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

const createClient = sinon.stub();
const log = { info: sinon.stub() };

describe('Instantiate Client', () => {
  afterEach(() => {
    createClient.resetHistory();
    log.info.resetHistory();
  });

  describe('Logging', () => {
    it('logs that the config was sourced from the production options', () => {
      instantiateClient(server.monitoring.ui.elasticsearch, log, createClient);

      expect(log.info.getCall(0).args).to.eql(['config sourced from: production cluster']);
    });

    it('logs that the config was sourced from the monitoring options', () => {
      instantiateClient(serverWithUrl.monitoring.ui.elasticsearch, log, createClient);

      expect(log.info.getCall(0).args).to.eql(['config sourced from: monitoring cluster']);
    });
  });

  describe('Custom Headers Configuration', () => {
    it('Does not add xpack.monitoring.elasticsearch.customHeaders if connected to production cluster', () => {
      instantiateClient(server.monitoring.ui.elasticsearch, log, createClient);

      const createClusterCall = createClient.getCall(0);

      sinon.assert.calledOnce(createClient);
      expect(createClusterCall.args[0]).to.be('monitoring');
      expect(createClusterCall.args[1].customHeaders).to.eql(undefined);
    });

    it('Adds xpack.monitoring.elasticsearch.customHeaders if connected to monitoring cluster', () => {
      instantiateClient(serverWithUrl.monitoring.ui.elasticsearch, log, createClient);

      const createClusterCall = createClient.getCall(0);

      sinon.assert.calledOnce(createClient);
      expect(createClusterCall.args[0]).to.be('monitoring');
      expect(createClusterCall.args[1].customHeaders).to.eql({
        'x-custom-headers-test': 'connection-monitoring',
      });
    });
  });

  describe('Use a connection to production cluster', () => {
    it('exposes an authenticated client using production host settings', () => {
      instantiateClient(server.monitoring.ui.elasticsearch, log, createClient);

      const createClusterCall = createClient.getCall(0);
      const createClientOptions = createClusterCall.args[1];

      sinon.assert.calledOnce(createClient);
      expect(createClusterCall.args[0]).to.be('monitoring');
      expect(createClientOptions.hosts).to.eql(undefined);
    });
  });

  describe('Use a connection to monitoring cluster', () => {
    it('exposes an authenticated client using monitoring host settings', () => {
      instantiateClient(serverWithUrl.monitoring.ui.elasticsearch, log, createClient);
      const createClusterCall = createClient.getCall(0);
      const createClientOptions = createClusterCall.args[1];

      sinon.assert.calledOnce(createClient);
      expect(createClusterCall.args[0]).to.be('monitoring');
      expect(createClientOptions.hosts[0]).to.eql('http://monitoring-cluster.test:9200');
      expect(createClientOptions.username).to.eql('monitoring-user-internal-test');
      expect(createClientOptions.password).to.eql('monitoring-p@ssw0rd!-internal-test');
    });
  });

  describe('hasMonitoringCluster', () => {
    it('returns true if monitoring is configured', () => {
      expect(hasMonitoringCluster(serverWithUrl.monitoring.ui.elasticsearch)).to.be(true);
    });

    it('returns false if monitoring is not configured', () => {
      expect(hasMonitoringCluster(server.monitoring.ui.elasticsearch)).to.be(false);
    });
  });
});
