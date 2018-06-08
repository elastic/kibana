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

describe('CollectorSet', () => {
  describe('registers a collector set and runs lifecycle events', () => {
    let server;
    let init;
    let fetch;
    beforeEach(() => {
      server = { log: sinon.spy() };
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
        expect(message).to.be('CollectorSet can only have Collector instances registered');
      });
    });

    it('should log debug status of fetching from the collector', async () => {
      const mockCallCluster = () => Promise.resolve({ passTest: 1000 });
      const collectors = new CollectorSet(server);
      collectors.register(new Collector(server, {
        type: 'MY_TEST_COLLECTOR',
        fetch: caller => caller()
      }));

      const result = await collectors.bulkFetch(mockCallCluster);
      const calls = server.log.getCalls();
      expect(calls.length).to.be(1);
      expect(calls[0].args).to.eql([
        ['debug', 'monitoring-ui', 'kibana-monitoring'],
        'Fetching data from MY_TEST_COLLECTOR collector',
      ]);
      expect(result).to.eql([{
        type: 'MY_TEST_COLLECTOR',
        result: { passTest: 1000 }
      }]);
    });
  });
});
