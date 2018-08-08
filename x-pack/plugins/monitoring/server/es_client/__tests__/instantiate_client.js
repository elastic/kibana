/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import sinon from 'sinon';
import { get, noop } from 'lodash';
import { exposeClient } from '../instantiate_client';

function getMockServerFromConnectionUrl(monitoringClusterUrl) {
  const server = {
    xpack: {
      monitoring: {
        elasticsearch: {
          url: monitoringClusterUrl,
          username: 'monitoring-user-internal-test',
          password: 'monitoring-p@ssw0rd!-internal-test',
          ssl: {},
          customHeaders: {
            'x-custom-headers-test': 'connection-monitoring'
          }
        }
      }
    },
    elasticsearch: {
      url: 'http://localhost:9200',
      username: 'user-internal-test',
      password: 'p@ssw0rd!-internal-test',
      ssl: {},
      customHeaders: {
        'x-custom-headers-test': 'connection-production'
      }
    }
  };

  const config = () => {
    return {
      get: (path) => { return get(server, path); },
      set: noop
    };
  };

  return {
    config,
    plugins: {
      elasticsearch: {
        getCluster: sinon.stub().withArgs('admin').returns({
          config: sinon.stub().returns(server.elasticsearch)
        }),
        createCluster: sinon.stub(),
        ElasticsearchClientLogging: noop
      }
    },
    on: noop,
    expose: sinon.stub(),
    log: sinon.stub()
  };
}

describe('Instantiate Client', () => {
  describe('Logging', () => {
    it('logs that the config was sourced from the production options', () => {
      const server = getMockServerFromConnectionUrl(null); // pass null for URL to create the client using prod config

      exposeClient(server);

      expect(server.log.getCall(0).args).to.eql([
        [ 'monitoring-ui', 'es-client' ],
        'config sourced from: production cluster (http://localhost:9200)'
      ]);
    });

    it('logs that the config was sourced from the monitoring options', () => {
      const server = getMockServerFromConnectionUrl('monitoring-cluster.test:9200');
      exposeClient(server);

      expect(server.log.getCall(0).args).to.eql([
        [ 'monitoring-ui', 'es-client' ],
        'config sourced from: monitoring cluster (monitoring-cluster.test:9200)'
      ]);
    });
  });

  describe('Custom Headers Configuration', () => {
    it('Adds xpack.monitoring.elasticsearch.customHeaders if connected to production cluster', () => {
      const server = getMockServerFromConnectionUrl(null); // pass null for URL to create the client using prod config

      exposeClient(server);

      const createCluster = server.plugins.elasticsearch.createCluster;
      const createClusterCall = createCluster.getCall(0);

      sinon.assert.calledOnce(createCluster);
      expect(createClusterCall.args[0]).to.be('monitoring');
      expect(createClusterCall.args[1].customHeaders).to.eql(
        { 'x-custom-headers-test': 'connection-production' }
      );
    });

    it('Adds xpack.monitoring.elasticsearch.customHeaders if connected to monitoring cluster', () => {
      const server = getMockServerFromConnectionUrl('http://monitoring-cluster.test:9200'); // pass null for URL to create the client using prod config

      exposeClient(server);

      const createCluster = server.plugins.elasticsearch.createCluster;
      const createClusterCall = createCluster.getCall(0);

      sinon.assert.calledOnce(createCluster);
      expect(createClusterCall.args[0]).to.be('monitoring');
      expect(createClusterCall.args[1].customHeaders).to.eql(
        { 'x-custom-headers-test': 'connection-monitoring' }
      );
    });
  });

  describe('Use a connection to production cluster', () => {
    it('exposes an authenticated client using production host settings', () => {
      const server = getMockServerFromConnectionUrl(null); // pass null for URL to create the client using prod config
      exposeClient(server);

      const createCluster = server.plugins.elasticsearch.createCluster;
      const createClusterCall = createCluster.getCall(0);
      const createClientOptions = createClusterCall.args[1];

      sinon.assert.calledOnce(createCluster);
      expect(createClusterCall.args[0]).to.be('monitoring');
      expect(createClientOptions.url).to.eql('http://localhost:9200');
    });
  });

  describe('Use a connection to monitoring cluster', () => {
    it('exposes an authenticated client using monitoring host settings', () => {
      const server = getMockServerFromConnectionUrl('http://monitoring-cluster.test:9200');
      exposeClient(server);

      const createCluster = server.plugins.elasticsearch.createCluster;
      const createClusterCall = createCluster.getCall(0);
      const createClientOptions = createClusterCall.args[1];

      sinon.assert.calledOnce(createCluster);
      expect(createClusterCall.args[0]).to.be('monitoring');
      expect(createClientOptions.url).to.eql('http://monitoring-cluster.test:9200');
      expect(createClientOptions.username).to.eql('monitoring-user-internal-test');
      expect(createClientOptions.password).to.eql('monitoring-p@ssw0rd!-internal-test');
    });
  });
});
