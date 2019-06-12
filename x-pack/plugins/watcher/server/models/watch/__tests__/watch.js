/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import sinon from 'sinon';
import proxyquire from 'proxyquire';
import { WATCH_TYPES } from '../../../../common/constants';

const watchTypeMocks = {};
function buildMock(watchType) {
  const fromDownstreamJsonMock = sinon.stub();
  const fromUpstreamJsonMock = sinon.stub();

  watchTypeMocks[watchType] = {
    fromDownstreamJsonMock,
    fromUpstreamJsonMock,
    Class: class WatchStub {
      static fromDownstreamJson(...args) {
        fromDownstreamJsonMock(...args);
      }
      static fromUpstreamJson(...args) {
        fromUpstreamJsonMock(...args);
      }
    }
  };
}

buildMock(WATCH_TYPES.JSON);
buildMock(WATCH_TYPES.THRESHOLD);
buildMock(WATCH_TYPES.MONITORING);

const { Watch } = proxyquire('../watch', {
  './json_watch': { JsonWatch: watchTypeMocks[WATCH_TYPES.JSON].Class },
  './monitoring_watch': { MonitoringWatch: watchTypeMocks[WATCH_TYPES.MONITORING].Class },
  './threshold_watch': { ThresholdWatch: watchTypeMocks[WATCH_TYPES.THRESHOLD].Class }
});

describe('Watch', () => {

  describe('getWatchTypes factory method', () => {

    it(`There should be a property for each watch type`, () => {
      // NOTE: If this test is failing because a new watch type was added
      // make sure you add a 'returns an instance of' test for the new type
      // as well.

      const watchTypes = Watch.getWatchTypes();
      const expected = Object.values(WATCH_TYPES).sort();
      const actual = Object.keys(watchTypes).sort();

      expect(actual).to.eql(expected);
    });

  });

  describe('fromDownstreamJson factory method', () => {

    beforeEach(() => {
      Object.keys(watchTypeMocks).forEach(key => {
        watchTypeMocks[key].fromDownstreamJsonMock.resetHistory();
      });
    });

    it(`throws an error if no 'type' property in json`, () => {
      expect(Watch.fromDownstreamJson).withArgs({})
        .to.throwError(/must contain an type property/i);
    });

    it(`throws an error if the type does not correspond to a WATCH_TYPES value`, () => {
      expect(Watch.fromDownstreamJson).withArgs({ type: 'foo' })
        .to.throwError(/Attempted to load unknown type foo/i);
    });

    it('fromDownstreamJson of JsonWatch to be called when type is WATCH_TYPES.JSON', () => {
      Watch.fromDownstreamJson({ type: WATCH_TYPES.JSON });
      expect(watchTypeMocks[WATCH_TYPES.JSON].fromDownstreamJsonMock.called).to.be(true);
    });

    it('fromDownstreamJson of ThresholdWatch to be called when type is WATCH_TYPES.THRESHOLD', () => {
      Watch.fromDownstreamJson({ type: WATCH_TYPES.THRESHOLD });
      expect(watchTypeMocks[WATCH_TYPES.THRESHOLD].fromDownstreamJsonMock.called).to.be(true);
    });

    it('fromDownstreamJson of MonitoringWatch to be called when type is WATCH_TYPES.MONITORING', () => {
      Watch.fromDownstreamJson({ type: WATCH_TYPES.MONITORING });
      expect(watchTypeMocks[WATCH_TYPES.MONITORING].fromDownstreamJsonMock.called).to.be(true);
    });

  });

  describe('fromUpstreamJson factory method', () => {

    beforeEach(() => {
      Object.keys(watchTypeMocks).forEach(key => {
        watchTypeMocks[key].fromUpstreamJsonMock.resetHistory();
      });
    });

    it(`throws an error if no 'watchJson' property in json`, () => {
      expect(Watch.fromUpstreamJson).withArgs({})
        .to.throwError(/must contain a watchJson property/i);
    });

    it('fromUpstreamJson of JsonWatch to be called when type is WATCH_TYPES.JSON', () => {
      Watch.fromUpstreamJson({
        watchJson: { metadata: { xpack: { type: WATCH_TYPES.JSON } } }
      });
      expect(watchTypeMocks[WATCH_TYPES.JSON].fromUpstreamJsonMock.called).to.be(true);
    });

    it('fromUpstreamJson of ThresholdWatch to be called when type is WATCH_TYPES.THRESHOLD', () => {
      Watch.fromUpstreamJson({
        watchJson: { metadata: { xpack: { type: WATCH_TYPES.THRESHOLD } } }
      });
      expect(watchTypeMocks[WATCH_TYPES.THRESHOLD].fromUpstreamJsonMock.called).to.be(true);
    });

    it('fromUpstreamJson of MonitoringWatch to be called when type is WATCH_TYPES.MONITORING', () => {
      Watch.fromUpstreamJson({
        watchJson: { metadata: { xpack: { type: WATCH_TYPES.MONITORING } } }
      });
      expect(watchTypeMocks[WATCH_TYPES.MONITORING].fromUpstreamJsonMock.called).to.be(true);
    });

  });

});
