/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { noop } from 'lodash';
import sinon from 'sinon';
import expect from 'expect.js';
import { Collector } from '../collector';
import { CollectorSet } from '../collector_set';

const INFO_LOG = ['info', 'monitoring-ui', 'kibana-monitoring'];

describe('CollectorSet', () => {
  describe('registers a collector set and runs lifecycle events', () => {
    let server;
    let init;
    let fetch;
    beforeEach(() => {
      server = {
        log: sinon.spy(),
      };
      init = noop;
      fetch = noop;
    });

    it('should throw an error if non-Collector type of object is registered', () => {
      const collectors = new CollectorSet(server);

      const registerPojo = () => {
        collectors.register({
          type: 'type_collector_test',
          init,
          fetch,
        });
      };

      expect(registerPojo).to.throwException(({ message }) => {
        expect(message).to.be(
          'CollectorSet can only have Collector instances registered'
        );
      });
    });

    it('should log the info-level status of stopping and restarting', done => {
      const collectors = new CollectorSet(server);

      collectors.register(new Collector(server));

      collectors.start();
      expect(
        server.log.calledWith(INFO_LOG, 'Starting all stats collectors')
      ).to.be(true);

      collectors.start();
      expect(
        server.log.calledWith(INFO_LOG, 'Starting all stats collectors')
      ).to.be(true);
      done();
    });
  });
});
