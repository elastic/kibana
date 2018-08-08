/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import sinon from 'sinon';
import { flagSupportedClusters } from '../flag_supported_clusters';

const mockReq = (log, queryResult = {}) => {
  return {
    server: {
      config() {
        return {
          get: sinon.stub()
            .withArgs('server.uuid').returns('kibana-1234')
        };
      },
      plugins: {
        elasticsearch: {
          getCluster() {
            return {
              callWithRequest() { return Promise.resolve(queryResult); }
            };
          }
        }
      },
      log
    },
    payload: {
      timeRange: { min: -Infinity, max: Infinity }
    }
  };
};
const goldLicense = () => ({ license: { type: 'gold' } });
const basicLicense = () => ({ license: { type: 'basic' } });

describe('Flag Supported Clusters', () => {
  describe('With multiple clusters in the monitoring data', () => {
    it('When all clusters are non-Basic licensed, all are supported', () => {
      const logStub = sinon.stub();
      const req = mockReq(logStub);
      const kbnIndices = [];
      const clusters = [
        goldLicense(),
        { }, // no license
        goldLicense()
      ];

      // pass 2 gold license clusters and check they all become flagged as supported
      return flagSupportedClusters(req, kbnIndices)(clusters)
        .then(resultClusters => {
          expect(resultClusters).to.eql([
            { ...goldLicense(), isSupported: true },
            { }, // no license
            { ...goldLicense(), isSupported: true }
          ]);
          sinon.assert.calledWith(
            logStub,
            ['debug', 'monitoring-ui', 'supported-clusters'],
            'Found all non-basic cluster licenses. All clusters will be supported.'
          );
        });
    });

    it('When all clusters are Basic licensed, admin cluster is supported', () => {
      // uses a an object for callWithRequest query result to match the cluster we want to be supported
      const logStub = sinon.stub();
      const req = mockReq(logStub, {
        hits: {
          hits: [ { _source: { cluster_uuid: 'supported_cluster_uuid' } } ]
        }
      });
      const kbnIndices = [];
      const clusters = [
        { cluster_uuid: 'supported_cluster_uuid', ...basicLicense() },
        { cluster_uuid: 'unsupported_cluster_uuid', ...basicLicense() }
      ];

      // pass 2 basic license clusters and check the intended cluster is flagged as supported
      return flagSupportedClusters(req, kbnIndices)(clusters)
        .then(resultClusters => {
          expect(resultClusters).to.eql([
            {
              cluster_uuid: 'supported_cluster_uuid',
              isSupported: true,
              ...basicLicense()
            },
            {
              cluster_uuid: 'unsupported_cluster_uuid',
              ...basicLicense()
            }
          ]);
          sinon.assert.calledWith(
            logStub,
            ['debug', 'monitoring-ui', 'supported-clusters'],
            'Detected all clusters in monitoring data have basic license. Checking for supported admin cluster UUID for Kibana kibana-1234.'
          );
          sinon.assert.calledWith(
            logStub,
            ['debug', 'monitoring-ui', 'supported-clusters'],
            'Found basic license admin cluster UUID for Monitoring UI support: supported_cluster_uuid.'
          );
        });
    });

    it('When some clusters are Basic licensed, only non-Basic licensed clusters are supported', () => {
      const logStub = sinon.stub();
      const req = mockReq(logStub);
      const kbnIndices = [];
      const clusters = [
        { cluster_uuid: 'supported_cluster_uuid_1', ...goldLicense() },
        { cluster_uuid: 'supported_cluster_uuid_2', ...goldLicense() },
        { cluster_uuid: 'unsupported_cluster_uuid', ...basicLicense() }
      ];

      // pass 2 various-license clusters and check the intended clusters are flagged as supported
      return flagSupportedClusters(req, kbnIndices)(clusters)
        .then(resultClusters => {
          expect(resultClusters).to.eql([
            {
              cluster_uuid: 'supported_cluster_uuid_1',
              isSupported: true,
              ...goldLicense()
            },
            {
              cluster_uuid: 'supported_cluster_uuid_2',
              isSupported: true,
              ...goldLicense()
            },
            {
              cluster_uuid: 'unsupported_cluster_uuid',
              ...basicLicense()
            }
          ]);
          sinon.assert.calledWith(
            logStub,
            ['debug', 'monitoring-ui', 'supported-clusters'],
            'Found some basic license clusters in monitoring data. Only non-basic will be supported.'
          );
        });
    });
  });

  describe('With single cluster in the monitoring data', () => {
    let logStub;
    beforeEach(() => logStub = sinon.stub());

    it('When there is a single Basic-licensed cluster in the data, it is supported', () => {
      const req = mockReq(logStub);
      const kbnIndices = [];
      const clusters = [{ ...basicLicense() }];
      return flagSupportedClusters(req, kbnIndices)(clusters)
        .then(result => {
          expect(result).to.eql([
            { isSupported: true, ...basicLicense() }
          ]);
          sinon.assert.calledWith(
            logStub,
            ['debug', 'monitoring-ui', 'supported-clusters'],
            'Found single cluster in monitoring data.'
          );
        });
    });

    it('When there is a single Gold-licensed cluster in the data, it is supported', () => {
      const req = mockReq(logStub);
      const kbnIndices = [];
      const clusters = [{ ...goldLicense() }];
      return flagSupportedClusters(req, kbnIndices)(clusters)
        .then(result => {
          expect(result).to.eql([
            { isSupported: true, ...goldLicense() }
          ]);
          sinon.assert.calledWith(
            logStub,
            ['debug', 'monitoring-ui', 'supported-clusters'],
            'Found single cluster in monitoring data.'
          );
        });
    });

    it('When there is a deleted-license cluster in the data, it is NOT supported', () => {
      const req = mockReq(logStub);
      const kbnIndices = [];
      const deletedLicense = () => ({ license: null });
      const clusters = [{ ...deletedLicense() }];
      return flagSupportedClusters(req, kbnIndices)(clusters)
        .then(result => {
          expect(result).to.eql([
            { ...deletedLicense() }
          ]);
          sinon.assert.calledWith(
            logStub,
            ['debug', 'monitoring-ui', 'supported-clusters'],
            'Found single cluster in monitoring data.'
          );
        });
    });
  });
});
