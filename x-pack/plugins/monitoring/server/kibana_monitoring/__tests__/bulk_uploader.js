/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { noop } from 'lodash';
import sinon from 'sinon';
import expect from 'expect.js';
import { Collector, CollectorSet } from '../classes';
import { BulkUploader } from '../bulk_uploader';

const FETCH_INTERVAL = 300;
const CHECK_DELAY = 500;

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
                  bulk: sinon.spy(),
                },
              }),
              callWithInternalUser: sinon.spy(), // this tests internal collection and bulk upload, not HTTP API
            }),
          },
        },
      };
    });

    it('should skip bulk upload if payload is empty', done => {
      const collectors = new CollectorSet(server);
      collectors.register(
        new Collector(server, {
          type: 'type_collector_test',
          fetch: noop, // empty payloads
        })
      );

      const uploader = new BulkUploader(server, {
        interval: FETCH_INTERVAL,
        combineTypes: noop,
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
          'Fetching data from type_collector_test collector',
        ]);
        expect(loggingCalls[2].args).to.eql([
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
      const combineTypes = sinon.spy(data => {
        return [data[0][0], { ...data[0][1], combined: true }];
      });

      const collectors = new CollectorSet(server);
      collectors.register(
        new Collector(server, {
          type: 'type_collector_test',
          fetch: () => ({ testData: 12345 }),
        })
      );
      const uploader = new BulkUploader(server, {
        interval: FETCH_INTERVAL,
        combineTypes,
      });

      uploader.start(collectors);

      // allow interval to tick a few times
      setTimeout(() => {
        uploader.stop();

        const loggingCalls = server.log.getCalls();
        expect(loggingCalls.length).to.be.greaterThan(2); // should be 3-5: start, fetch, upload, fetch, upload
        expect(loggingCalls[0].args).to.eql([
          ['info', 'monitoring-ui', 'kibana-monitoring'],
          'Starting monitoring stats collection',
        ]);
        expect(loggingCalls[1].args).to.eql([
          ['debug', 'monitoring-ui', 'kibana-monitoring'],
          'Fetching data from type_collector_test collector',
        ]);
        expect(loggingCalls[2].args).to.eql([
          ['debug', 'monitoring-ui', 'kibana-monitoring'],
          'Uploading bulk stats payload to the local cluster',
        ]);

        // un-flattened
        const combineCalls = combineTypes.getCalls();
        expect(combineCalls.length).to.be.greaterThan(0); // should be 1-2 fetch and combine cycles
        expect(combineCalls[0].args).to.eql([
          [[{ index: { _type: 'type_collector_test' } }, { testData: 12345 }]],
        ]);

        done();
      }, CHECK_DELAY);
    });
  });
});
