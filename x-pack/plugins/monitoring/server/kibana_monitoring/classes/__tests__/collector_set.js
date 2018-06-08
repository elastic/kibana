/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { identity, noop } from 'lodash';
import sinon from 'sinon';
import expect from 'expect.js';
import { Collector } from '../collector';
import { CollectorSet } from '../collector_set';

const DEBUG_LOG = [ 'debug', 'monitoring-ui', 'kibana-monitoring' ];
const INFO_LOG = [ 'info', 'monitoring-ui', 'kibana-monitoring' ];

const COLLECTOR_INTERVAL = 10000;
const CHECK_DELAY = 100; // can be lower than COLLECTOR_INTERVAL because the collectors use fetchAfterInit

describe('CollectorSet', () => {
  describe('registers a collector set and runs lifecycle events', () => {
    let server;
    let init;
    let cleanup;
    let fetch;
    beforeEach(() => {
      server = {
        log: sinon.spy(),
        plugins: {
          elasticsearch: {
            getCluster: () => ({
              callWithInternalUser: sinon.spy() // this tests internal collection and bulk upload, not HTTP API
            })
          }
        }
      };
      init = noop;
      cleanup = noop;
      fetch = noop;
    });

    it('should throw an error if non-Collector type of object is registered', () => {
      const collectors = new CollectorSet(server, {
        interval: COLLECTOR_INTERVAL,
        combineTypes: identity,
        onPayload: identity
      });

      const registerPojo = () => {
        collectors.register({
          type: 'type_collector_test',
          fetchAfterInit: true,
          init,
          fetch,
          cleanup
        });
      };

      expect(registerPojo).to.throwException(({ message }) => {
        expect(message).to.be('CollectorSet can only have Collector instances registered');
      });
    });

    it('should skip bulk upload if payload is empty', (done) => {
      const collectors = new CollectorSet(server, {
        interval: COLLECTOR_INTERVAL,
        combineTypes: identity,
        onPayload: identity
      });

      collectors.register(new Collector(server, {
        type: 'type_collector_test',
        fetchAfterInit: true,
        init,
        fetch,
        cleanup
      }));

      collectors.start();

      // allow interval to tick a few times
      setTimeout(() => {
        collectors.cleanup();

        expect(server.log.calledWith(INFO_LOG, 'Starting all stats collectors')).to.be(true);
        expect(server.log.calledWith(DEBUG_LOG, 'Initializing type_collector_test collector')).to.be(true);
        expect(server.log.calledWith(DEBUG_LOG, 'Fetching data from type_collector_test collector')).to.be(true);
        expect(server.log.calledWith(DEBUG_LOG, 'Skipping bulk uploading of an empty stats payload')).to.be(true); // proof of skip
        expect(server.log.calledWith(INFO_LOG, 'Stopping all stats collectors')).to.be(true);
        expect(server.log.calledWith(DEBUG_LOG, 'Running type_collector_test cleanup')).to.be(true);

        done(); // for async exit
      }, CHECK_DELAY);
    });

    it('should run the bulk upload handler', (done) => {
      const combineTypes = sinon.spy(data => {
        return [
          data[0][0],
          { ...data[0][1], combined: true }
        ];
      });
      const onPayload = sinon.spy();

      const collectors = new CollectorSet(server, {
        interval: COLLECTOR_INTERVAL,
        combineTypes,
        onPayload
      });

      fetch = () => ({ testFetch: true });
      collectors.register(new Collector(server, {
        type: 'type_collector_test',
        fetchAfterInit: true,
        init,
        fetch,
        cleanup
      }));

      collectors.start();

      // allow interval to tick a few times
      setTimeout(() => {
        collectors.cleanup();

        expect(server.log.calledWith(INFO_LOG, 'Starting all stats collectors')).to.be(true);
        expect(server.log.calledWith(DEBUG_LOG, 'Initializing type_collector_test collector')).to.be(true);
        expect(server.log.calledWith(DEBUG_LOG, 'Fetching data from type_collector_test collector')).to.be(true);
        expect(server.log.calledWith(DEBUG_LOG, 'Uploading bulk stats payload to the local cluster')).to.be(true);
        expect(server.log.calledWith(INFO_LOG, 'Stopping all stats collectors')).to.be(true);
        expect(server.log.calledWith(DEBUG_LOG, 'Running type_collector_test cleanup')).to.be(true);

        // un-flattened
        expect(combineTypes.getCall(0).args[0]).to.eql(
          [ [ { index: { _type: 'type_collector_test' } }, { testFetch: true } ] ]
        );

        // flattened and altered
        expect(onPayload.getCall(0).args[0]).to.eql(
          [ { index: { _type: 'type_collector_test' } }, { testFetch: true, combined: true } ]
        );

        done(); // for async exit
      }, CHECK_DELAY);
    });

    it('should log the info-level status of stopping and restarting', (done) => {
      const collectors = new CollectorSet(server, {
        interval: COLLECTOR_INTERVAL,
        combineTypes: identity,
        onPayload: identity
      });

      collectors.register(new Collector(server, {
        type: 'type_collector_test',
        fetchAfterInit: true,
        init,
        fetch,
        cleanup
      }));

      collectors.start();
      expect(server.log.calledWith(INFO_LOG, 'Starting all stats collectors')).to.be(true);

      collectors.cleanup();
      expect(server.log.calledWith(INFO_LOG, 'Stopping all stats collectors')).to.be(true);

      collectors.start();
      expect(server.log.calledWith(INFO_LOG, 'Starting all stats collectors')).to.be(true);

      // exit
      collectors.cleanup();
      done();
    });
  });
});
