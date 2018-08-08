/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import sinon from 'sinon';
import { Telemetry } from '../telemetry';
import { uiModules } from 'ui/modules';

uiModules.get('kibana')
  // disable stat reporting while running tests,
  // MockInjector used in these tests is not impacted
  .constant('telemetryEnabled', false)
  .constant('telemetryUrl', 'not.a.valid.url.0');

const getMockInjector = ({ allowReport, lastReport }) => {
  const get = sinon.stub();
  get.withArgs('localStorage').returns({
    get: sinon.stub().returns({ lastReport: lastReport }),
    set: sinon.stub()
  });
  get.withArgs('config').returns({
    get: () => allowReport
  });
  const mockHttp = (req) => {
    return req;
  };
  mockHttp.get = (url) => Promise.resolve({
    data: [
      url,
      { info: true }
    ]
  });

  get.withArgs('$http').returns(mockHttp);
  get.withArgs('telemetryUrl').returns('https://testo.com/');

  return { get };
};
const mockFetchTelemetry = () => Promise.resolve({
  data: [
    { cluster_uuid: 'fake-123', },
    { cluster_uuid: 'fake-456' }
  ]
});

describe('telemetry class', () => {
  it('start method for beginning a timer', () => {
    const sender = new Telemetry(getMockInjector({ allowReport: true }), mockFetchTelemetry);
    expect(sender.start).to.be.a('function');
  });

  // call the private method
  describe('should send a report', () => {
    it('never reported before', () => {
      const sender = new Telemetry(
        getMockInjector({ allowReport: true }),
        mockFetchTelemetry
      );
      return sender._sendIfDue()
        .then(result => {
          expect(result).to.eql([
            {
              method: 'POST',
              url: 'https://testo.com/',
              data: { cluster_uuid: 'fake-123' },
              kbnXsrfToken: false
            },
            {
              method: 'POST',
              url: 'https://testo.com/',
              data: { cluster_uuid: 'fake-456' },
              kbnXsrfToken: false
            }
          ]);
        });
    });

    it('interval check finds last report over a day ago', () => {
      const sender = new Telemetry(
        getMockInjector({
          allowReport: true,
          lastReport: (new Date()).getTime() - 86401000 // reported 1 day + 1 second ago
        }),
        mockFetchTelemetry
      );
      return sender._sendIfDue()
        .then(result => expect(result).to.eql([
          {
            method: 'POST',
            url: 'https://testo.com/',
            data: { cluster_uuid: 'fake-123' },
            kbnXsrfToken: false
          },
          {
            method: 'POST',
            url: 'https://testo.com/',
            data: { cluster_uuid: 'fake-456' },
            kbnXsrfToken: false
          }
        ]));
    });
  });

  describe('should not send the report', () => {
    it('config does not allow report', () => {
      const sender = new Telemetry(getMockInjector({ allowReport: false }), mockFetchTelemetry);
      return sender._sendIfDue()
        .then(result => expect(result).to.be(null));
    });

    it('interval check finds last report less than a day ago', () => {
      const sender = new Telemetry(
        getMockInjector({
          allowReport: true,
          lastReport: (new Date()).getTime() - 82800000 // reported 23 hours ago
        }),
        mockFetchTelemetry
      );
      return sender._sendIfDue()
        .then(result => expect(result).to.be(null));
    });
  });
});
