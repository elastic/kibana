/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';

import { getDateRange, getDates, MomentUnit } from './date_ranges';

describe('dateRanges', () => {
  describe('#getDates', () => {
    test('given a unit of "year", it returns the four quarters of the year', () => {
      const unit: MomentUnit = 'year';
      const end = moment.utc('Mon, 31 Dec 2018 23:59:59 -0700');
      const current = moment.utc('Mon, 01 Jan 2018 00:00:00 -0700');

      expect(getDates({ unit, end, current })).toEqual(
        [
          '2018-01-01T07:00:00.000Z',
          '2018-04-01T07:00:00.000Z',
          '2018-07-01T07:00:00.000Z',
          '2018-10-01T07:00:00.000Z',
        ].map(d => new Date(d))
      );
    });

    test('given a unit of "month", it returns all the weeks of the month', () => {
      const unit: MomentUnit = 'month';
      const end = moment.utc('Wed, 31 Oct 2018 23:59:59 -0600');
      const current = moment.utc('Mon, 01 Oct 2018 00:00:00 -0600');

      expect(getDates({ unit, end, current })).toEqual(
        [
          '2018-10-01T06:00:00.000Z',
          '2018-10-08T06:00:00.000Z',
          '2018-10-15T06:00:00.000Z',
          '2018-10-22T06:00:00.000Z',
          '2018-10-29T06:00:00.000Z',
        ].map(d => new Date(d))
      );
    });

    test('given a unit of "week", it returns all the days of the week', () => {
      const unit: MomentUnit = 'week';
      const end = moment.utc('Sat, 27 Oct 2018 23:59:59 -0600');
      const current = moment.utc('Sun, 21 Oct 2018 00:00:00 -0600');

      expect(getDates({ unit, end, current })).toEqual(
        [
          '2018-10-21T06:00:00.000Z',
          '2018-10-22T06:00:00.000Z',
          '2018-10-23T06:00:00.000Z',
          '2018-10-24T06:00:00.000Z',
          '2018-10-25T06:00:00.000Z',
          '2018-10-26T06:00:00.000Z',
          '2018-10-27T06:00:00.000Z',
        ].map(d => new Date(d))
      );
    });

    test('given a unit of "day", it returns all the hours of the day', () => {
      const unit: MomentUnit = 'day';
      const end = moment.utc('Tue, 23 Oct 2018 23:59:59 -0600');
      const current = moment.utc('Tue, 23 Oct 2018 00:00:00 -0600');

      expect(getDates({ unit, end, current })).toEqual(
        [
          '2018-10-23T06:00:00.000Z',
          '2018-10-23T07:00:00.000Z',
          '2018-10-23T08:00:00.000Z',
          '2018-10-23T09:00:00.000Z',
          '2018-10-23T10:00:00.000Z',
          '2018-10-23T11:00:00.000Z',
          '2018-10-23T12:00:00.000Z',
          '2018-10-23T13:00:00.000Z',
          '2018-10-23T14:00:00.000Z',
          '2018-10-23T15:00:00.000Z',
          '2018-10-23T16:00:00.000Z',
          '2018-10-23T17:00:00.000Z',
          '2018-10-23T18:00:00.000Z',
          '2018-10-23T19:00:00.000Z',
          '2018-10-23T20:00:00.000Z',
          '2018-10-23T21:00:00.000Z',
          '2018-10-23T22:00:00.000Z',
          '2018-10-23T23:00:00.000Z',
          '2018-10-24T00:00:00.000Z',
          '2018-10-24T01:00:00.000Z',
          '2018-10-24T02:00:00.000Z',
          '2018-10-24T03:00:00.000Z',
          '2018-10-24T04:00:00.000Z',
          '2018-10-24T05:00:00.000Z',
        ].map(d => new Date(d))
      );
    });
  });

  describe('#getDateRange', () => {
    let dateSpy: jest.Mock<number, []>;

    beforeEach(() => {
      dateSpy = jest
        .spyOn(Date, 'now')
        .mockImplementation(() => new Date(Date.UTC(2018, 10, 23)).valueOf());
    });

    afterEach(() => {
      dateSpy.mockReset();
    });

    test('given a unit of "day", it returns all the hours of the day', () => {
      const unit: MomentUnit = 'day';

      const dates = getDateRange(unit);
      expect(dates).toEqual(
        [
          '2018-11-23T00:00:00.000Z',
          '2018-11-23T01:00:00.000Z',
          '2018-11-23T02:00:00.000Z',
          '2018-11-23T03:00:00.000Z',
          '2018-11-23T04:00:00.000Z',
          '2018-11-23T05:00:00.000Z',
          '2018-11-23T06:00:00.000Z',
          '2018-11-23T07:00:00.000Z',
          '2018-11-23T08:00:00.000Z',
          '2018-11-23T09:00:00.000Z',
          '2018-11-23T10:00:00.000Z',
          '2018-11-23T11:00:00.000Z',
          '2018-11-23T12:00:00.000Z',
          '2018-11-23T13:00:00.000Z',
          '2018-11-23T14:00:00.000Z',
          '2018-11-23T15:00:00.000Z',
          '2018-11-23T16:00:00.000Z',
          '2018-11-23T17:00:00.000Z',
          '2018-11-23T18:00:00.000Z',
          '2018-11-23T19:00:00.000Z',
          '2018-11-23T20:00:00.000Z',
          '2018-11-23T21:00:00.000Z',
          '2018-11-23T22:00:00.000Z',
          '2018-11-23T23:00:00.000Z',
        ].map(d => new Date(d))
      );
    });
  });
});
