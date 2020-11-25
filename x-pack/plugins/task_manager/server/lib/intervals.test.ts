/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import sinon from 'sinon';
import {
  parseIntervalAsSecond,
  parseIntervalAsMillisecond,
  intervalFromNow,
  intervalFromDate,
  secondsFromNow,
  secondsFromDate,
  asInterval,
} from './intervals';

let fakeTimer: sinon.SinonFakeTimers;

beforeAll(() => {
  fakeTimer = sinon.useFakeTimers();
});

afterAll(() => fakeTimer.restore());

describe('taskIntervals', () => {
  describe('parseIntervalAsSecond', () => {
    test('it accepts intervals in the form `Nm`', () => {
      expect(() => parseIntervalAsSecond(`${_.random(1, 1000)}m`)).not.toThrow();
    });

    test('it accepts intervals in the form `Ns`', () => {
      expect(() => parseIntervalAsSecond(`${_.random(1, 1000)}s`)).not.toThrow();
    });

    test('it rejects 0 based intervals', () => {
      expect(() => parseIntervalAsSecond('0m')).toThrow(
        /Invalid interval "0m"\. Intervals must be of the form {number}m. Example: 5m/
      );
      expect(() => parseIntervalAsSecond('0s')).toThrow(
        /Invalid interval "0s"\. Intervals must be of the form {number}m. Example: 5m/
      );
    });

    test('it rejects intervals are not of the form `Nm` or `Ns`', () => {
      expect(() => parseIntervalAsSecond(`5m 2s`)).toThrow(
        /Invalid interval "5m 2s"\. Intervals must be of the form {number}m. Example: 5m/
      );
      expect(() => parseIntervalAsSecond(`hello`)).toThrow(
        /Invalid interval "hello"\. Intervals must be of the form {number}m. Example: 5m/
      );
    });

    test('returns an interval as s', () => {
      expect(parseIntervalAsSecond('5s')).toEqual(5);
      expect(parseIntervalAsSecond('15s')).toEqual(15);
      expect(parseIntervalAsSecond('20m')).toEqual(20 * 60);
      expect(parseIntervalAsSecond('61m')).toEqual(61 * 60);
      expect(parseIntervalAsSecond('90m')).toEqual(90 * 60);
      expect(parseIntervalAsSecond('2h')).toEqual(2 * 60 * 60);
      expect(parseIntervalAsSecond('9d')).toEqual(9 * 60 * 60 * 24);
    });
  });

  describe('parseIntervalAsMillisecond', () => {
    test('it accepts intervals in the form `Nm`', () => {
      expect(() => parseIntervalAsMillisecond(`${_.random(1, 1000)}m`)).not.toThrow();
    });

    test('it accepts intervals in the form `Ns`', () => {
      expect(() => parseIntervalAsMillisecond(`${_.random(1, 1000)}s`)).not.toThrow();
    });

    test('it rejects 0 based intervals', () => {
      expect(() => parseIntervalAsMillisecond('0m')).toThrow(
        /Invalid interval "0m"\. Intervals must be of the form {number}m. Example: 5m/
      );
      expect(() => parseIntervalAsMillisecond('0s')).toThrow(
        /Invalid interval "0s"\. Intervals must be of the form {number}m. Example: 5m/
      );
    });

    test('it rejects intervals are not of the form `Nm` or `Ns`', () => {
      expect(() => parseIntervalAsMillisecond(`5m 2s`)).toThrow(
        /Invalid interval "5m 2s"\. Intervals must be of the form {number}m. Example: 5m/
      );
      expect(() => parseIntervalAsMillisecond(`hello`)).toThrow(
        /Invalid interval "hello"\. Intervals must be of the form {number}m. Example: 5m/
      );
    });

    test('returns an interval as ms', () => {
      expect(parseIntervalAsMillisecond('5s')).toEqual(5 * 1000);
      expect(parseIntervalAsMillisecond('15s')).toEqual(15 * 1000);
      expect(parseIntervalAsMillisecond('20m')).toEqual(20 * 60 * 1000);
      expect(parseIntervalAsMillisecond('61m')).toEqual(61 * 60 * 1000);
      expect(parseIntervalAsMillisecond('90m')).toEqual(90 * 60 * 1000);
      expect(parseIntervalAsMillisecond('1h')).toEqual(60 * 60 * 1000);
      expect(parseIntervalAsMillisecond('3d')).toEqual(3 * 24 * 60 * 60 * 1000);
    });
  });

  describe('asInterval', () => {
    test('returns a ms interval when ms duration can only divide by ms', () => {
      expect(asInterval(500)).toEqual('500ms');
      expect(asInterval(1500)).toEqual('1500ms');
      expect(asInterval(1001)).toEqual('1001ms');
      expect(asInterval(2001)).toEqual('2001ms');
      expect(asInterval(61001)).toEqual('61001ms');
      expect(asInterval(90001)).toEqual('90001ms');
    });

    test('returns a seconds interval when ms duration divides by seconds', () => {
      expect(asInterval(1000)).toEqual('1s');
      expect(asInterval(2000)).toEqual('2s');
      expect(asInterval(61000)).toEqual('61s');
      expect(asInterval(99000)).toEqual('99s');
      expect(asInterval(90000)).toEqual('90s');
    });

    test('returns a minutes interval when ms duration divides by minutes', () => {
      expect(asInterval(60000)).toEqual('1m');
      expect(asInterval(120000)).toEqual('2m');
    });
  });

  describe('intervalFromNow', () => {
    test('it returns the current date plus n minutes', () => {
      const mins = _.random(1, 100);
      const expected = Date.now() + mins * 60 * 1000;
      const nextRun = intervalFromNow(`${mins}m`)!.getTime();
      expect(nextRun).toEqual(expected);
    });

    test('it returns the current date plus n seconds', () => {
      const secs = _.random(1, 100);
      const expected = Date.now() + secs * 1000;
      const nextRun = intervalFromNow(`${secs}s`)!.getTime();
      expect(nextRun).toEqual(expected);
    });

    test('it rejects intervals are not of the form `Nm` or `Ns`', () => {
      expect(() => intervalFromNow(`5m 2s`)).toThrow(
        /Invalid interval "5m 2s"\. Intervals must be of the form {number}m. Example: 5m/
      );
      expect(() => intervalFromNow(`hello`)).toThrow(
        /Invalid interval "hello"\. Intervals must be of the form {number}m. Example: 5m/
      );
    });

    test('it rejects 0 based intervals', () => {
      expect(() => intervalFromNow('0m')).toThrow(
        /Invalid interval "0m"\. Intervals must be of the form {number}m. Example: 5m/
      );
      expect(() => intervalFromNow('0s')).toThrow(
        /Invalid interval "0s"\. Intervals must be of the form {number}m. Example: 5m/
      );
    });
  });

  describe('intervalFromDate', () => {
    test('it returns the given date plus n minutes', () => {
      const originalDate = new Date(2019, 1, 1);
      const mins = _.random(1, 100);
      const expected = originalDate.valueOf() + mins * 60 * 1000;
      const nextRun = intervalFromDate(originalDate, `${mins}m`)!.getTime();
      expect(expected).toEqual(nextRun);
    });

    test('it returns the current date plus n seconds', () => {
      const originalDate = new Date(2019, 1, 1);
      const secs = _.random(1, 100);
      const expected = originalDate.valueOf() + secs * 1000;
      const nextRun = intervalFromDate(originalDate, `${secs}s`)!.getTime();
      expect(expected).toEqual(nextRun);
    });

    test('it rejects intervals are not of the form `Nm` or `Ns`', () => {
      const date = new Date();
      expect(() => intervalFromDate(date, `5m 2s`)).toThrow(
        /Invalid interval "5m 2s"\. Intervals must be of the form {number}m. Example: 5m/
      );
      expect(() => intervalFromDate(date, `hello`)).toThrow(
        /Invalid interval "hello"\. Intervals must be of the form {number}m. Example: 5m/
      );
    });

    test('it rejects 0 based intervals', () => {
      const date = new Date();
      expect(() => intervalFromDate(date, '0m')).toThrow(
        /Invalid interval "0m"\. Intervals must be of the form {number}m. Example: 5m/
      );
      expect(() => intervalFromDate(date, '0s')).toThrow(
        /Invalid interval "0s"\. Intervals must be of the form {number}m. Example: 5m/
      );
    });
  });

  describe('secondsFromNow', () => {
    test('it returns the current date plus a number of seconds', () => {
      const secs = _.random(1, 100);
      const expected = Date.now() + secs * 1000;
      const nextRun = secondsFromNow(secs).getTime();
      expect(nextRun).toEqual(expected);
    });
  });

  describe('secondsFromDate', () => {
    test('it returns the given date plus a number of seconds', () => {
      const originalDate = new Date(2019, 1, 1);
      const secs = _.random(1, 100);
      const expected = originalDate.valueOf() + secs * 1000;
      const nextRun = secondsFromDate(originalDate, secs).getTime();
      expect(expected).toEqual(nextRun);
    });
  });
});
