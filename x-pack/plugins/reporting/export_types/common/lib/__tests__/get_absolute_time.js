/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import moment from 'moment';
import sinon from 'sinon';
import { getAbsoluteTime } from '../get_absolute_time';

describe('get_absolute_time', function () {
  let anchor;
  let unix;
  let clock;

  beforeEach(() => {
    anchor =  '2016-07-04T14:16:32.123Z';
    unix = moment(anchor).valueOf();
    clock = sinon.useFakeTimers(unix);
  });

  afterEach(() => {
    clock.restore();
  });

  describe('invalid input', function () {
    let timeObj;

    beforeEach(() => {
      timeObj = {
        mode: 'absolute',
        from: '2016-07-04T14:01:32.123Z',
        to: '2016-07-04T14:16:32.123Z',
      };
    });

    it('should return time if missing mode', function () {
      delete timeObj.mode;
      expect(getAbsoluteTime(timeObj)).to.equal(timeObj);
    });

    it('should return time if missing from', function () {
      delete timeObj.from;
      expect(getAbsoluteTime(timeObj)).to.equal(timeObj);
    });

    it('should return time if missing to', function () {
      delete timeObj.to;
      expect(getAbsoluteTime(timeObj)).to.equal(timeObj);
    });
  });

  describe('absolute time', function () {
    let timeObj;

    beforeEach(() => {
      timeObj = {
        mode: 'absolute',
        from: '2016-07-04T14:01:32.123Z',
        to: '2016-07-04T14:16:32.123Z',
        testParam: 'some value',
      };
    });

    it('should return time if already absolute', function () {
      expect(getAbsoluteTime(timeObj)).to.equal(timeObj);
    });
  });

  describe('relative time', function () {
    let timeObj;

    beforeEach(() => {
      timeObj = {
        mode: 'relative',
        from: 'now-15m',
        to: 'now',
        testParam: 'some value',
      };
    });

    it('should return the absolute time', function () {
      const output = getAbsoluteTime(timeObj);
      expect(output.mode).to.equal('absolute');
    });

    it('should map from and to values to times', function () {
      const output = getAbsoluteTime(timeObj);
      const check = {
        from: '2016-07-04T14:01:32.123Z',
        to: '2016-07-04T14:16:32.123Z',
      };

      expect(moment(output.from).toISOString()).to.equal(check.from);
      expect(moment(output.to).toISOString()).to.equal(check.to);
    });
  });

  describe('quick time', function () {
    let timeObj;

    beforeEach(() => {
      timeObj = {
        mode: 'quick',
        from: 'now-1w/w',
        to: 'now-1w/w',
        testParam: 'some value',
      };
    });

    it('should return the absolute time', function () {
      const output = getAbsoluteTime(timeObj);
      expect(output.mode).to.equal('absolute');
    });

    it('should map previous week values to times', function () {
      const output = getAbsoluteTime(timeObj);
      const check = {
        from: /2016\-06\-2(5|6)T..\:00\:00\.000Z/,
        to: /2016\-07\-0(2|3)T..\:59\:59\.999Z/,
      };

      expect(moment(output.from).toISOString()).to.match(check.from);
      expect(moment(output.to).toISOString()).to.match(check.to);
    });
  });

});