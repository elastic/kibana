/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getChartDateLabel } from '../get_chart_date_label';

describe('getChartLabelFormatter', () => {
  beforeEach(() => {
    // Thu, 19 Jul 2001 17:39:39 GMT
    Date.now = jest.fn(() => 995564379100);
  });

  it('throws error for invalid date range', () => {
    // Thu, 19 Jul 2001 17:52:59 GMT -> Thu, 19 Jul 2001 17:50:00 GMT
    expect(() => getChartDateLabel(995565179000, 995565000000)).toThrowError('Invalid date range.');
  });

  it('creates a format without day/month/hour for range within an hour', () => {
    // Thu, 19 Jul 2001 17:50:00 GMT -> Thu, 19 Jul 2001 17:52:59 GMT
    expect(getChartDateLabel(995565000000, 995565179000)).toBe('HH:mm:ss');
  });

  it('creates a label with month/day and hour/minute for time between 36 hours and 4 days', () => {
    // Sun, 15 Jul 2001 17:53:10 GMT -> Thu, 19 Jul 2001 17:52:59 GMT
    expect(getChartDateLabel(995219590000, 995565179000)).toBe('MM-DD HH:mm');
  });

  it('creates a format without day/month string for delta within same day local time', () => {
    // Thu, 19 Jul 2001 14:52:59 GMT -> Thu, 19 Jul 2001 17:52:59 GMT
    expect(getChartDateLabel(995554379000, 995565179000)).toBe('HH:mm');
  });

  it('creates a format with date/month string for delta crossing dates', () => {
    // Wed, 18 Jul 2001 11:06:19 GMT -> Thu, 19 Jul 2001 17:52:59 GMT
    expect(getChartDateLabel(995454379000, 995565179000)).toBe('MM-DD HH:mm');
  });

  it('creates a format with only month/day for delta between to eight days and two weeks', () => {
    // Sun, 01 Jul 2001 23:28:15 GMT -> Thu, 19 Jul 2001 17:52:59 GMT
    expect(getChartDateLabel(994030095000, 995565179000)).toBe('MM-DD');
  });

  it('creates a format with the date and hour/min for 36h < range < 9d', () => {
    expect(getChartDateLabel(1003752000000, 1004270400000)).toBe('MM-DD HH:mm');
  });

  it('creates a format with month/day for range between nine days and three weeks', () => {
    expect(getChartDateLabel(1003752000000, 1004875200000)).toBe('MM-DD');
  });

  it('creates a format with the year/month/day for range exceeding three weeks', () => {
    // Sun, 15 Jul 2001 12:27:59 GMT -> Fri, 28 Dec 2001 18:46:19 GMT
    expect(getChartDateLabel(995200079000, 1009565179000)).toBe('YYYY-MM-DD');
  });

  it('creates a format of only year for timespan > 4 years', () => {
    // Tue, 07 Jan 1986 03:59:39 GMT -> Sat, 22 Jun 1996 14:39:39 GMT
    expect(getChartDateLabel(505454379000, 835454379000)).toBe('yyyy');
  });
});
