/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { noop } from 'lodash';
import sinon from 'sinon';
import expect from 'expect.js';
import { BulkUploader } from '../bulk_uploader';

const FETCH_INTERVAL = 300;
const CHECK_DELAY = 500;

class MockCollectorSet {
  constructor(_mockServer, mockCollectors) {
    this.mockServer = _mockServer;
    this.mockCollectors = mockCollectors;
  }
  getCollectorByType(type) {
    return this.mockCollectors.find(collector => collector.type === type) || this.mockCollectors[0];
  }
  getFilteredCollectorSet(filter) {
    return new MockCollectorSet(this.mockServer, this.mockCollectors.filter(filter));
  }
  async bulkFetch() {
    return this.mockCollectors.map(({ fetch }) => fetch());
  }
}

describe('BulkUploader', () => {
  describe('registers a collector set and runs lifecycle events', () => {
    let server;
    beforeEach(() => {
      server = {
        log: sinon.spy(),
        plugins: {
          elasticsearch: {
            getCluster: () => ({
              createClient: () => ({
                monitoring: {
                  bulk: function () {
                    return new Promise(resolve => setTimeout(resolve, CHECK_DELAY + 1));
                  }
                },
              }),
              callWithInternalUser: sinon.spy(), // this tests internal collection and bulk upload, not HTTP API
            }),
          },
        },
        usage: {},
      };
    });

    it('should skip bulk upload if payload is empty', done => {
      const collectors = new MockCollectorSet(server, [
        {
          type: 'type_collector_test',
          fetch: noop, // empty payloads,
          formatForBulkUpload: result => result,
        }
      ]);

      const uploader = new BulkUploader(server, {
        interval: FETCH_INTERVAL
      });

      uploader.start(collectors);

      // allow interval to tick a few times
      setTimeout(() => {
        uploader.stop();

        const loggingCalls = server.log.getCalls();
        expect(loggingCalls.length).to.be.greaterThan(2); // should be 3-5: start, fetch, skip, fetch, skip
        expect(loggingCalls[0].args).to.eql([
          ['info', 'monitoring-ui', 'kibana-monitoring'],
          'Starting monitoring stats collection',
        ]);
        expect(loggingCalls[1].args).to.eql([
          ['debug', 'monitoring-ui', 'kibana-monitoring'],
          'Skipping bulk uploading of an empty stats payload',
        ]);
        expect(loggingCalls[loggingCalls.length - 1].args).to.eql([
          ['info', 'monitoring-ui', 'kibana-monitoring'],
          'Monitoring stats collection is stopped',
        ]);

        done();
      }, CHECK_DELAY);
    });

    it('should run the bulk upload handler', done => {
      const collectors = new MockCollectorSet(server, [
        {
          fetch: () => ({ type: 'type_collector_test', result: { testData: 12345 } }),
          formatForBulkUpload: result => result
        }
      ]);
      const uploader = new BulkUploader(server, {
        interval: FETCH_INTERVAL
      });

      uploader.start(collectors);

      // allow interval to tick a few times
      setTimeout(() => {
        uploader.stop();

        const loggingCalls = server.log.getCalls();
        // If we are properly awaiting the bulk upload call, we shouldn't see
        // the last 2 logs as the call takes longer than this timeout (see the above mock)
        expect(loggingCalls.length).to.be(4);
        expect(loggingCalls[0].args).to.eql([
          ['info', 'monitoring-ui', 'kibana-monitoring'],
          'Starting monitoring stats collection',
        ]);
        expect(loggingCalls[1].args).to.eql([
          ['debug', 'monitoring-ui', 'kibana-monitoring'],
          'Uploading bulk stats payload to the local cluster',
        ]);

        done();
      }, CHECK_DELAY);
    });
  });
});
