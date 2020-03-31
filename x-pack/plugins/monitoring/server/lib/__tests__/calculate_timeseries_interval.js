/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import expect from '@kbn/expect';
import { calculateTimeseriesInterval } from '../calculate_timeseries_interval';

describe('calculateTimeseriesInterval', () => {
  it('returns an interval of 10s when duration is 15m', () => {
    const upperBound = moment.utc();
    const lowerBound = upperBound.clone().subtract(15, 'minutes');
    const minIntervalSeconds = 10;

    expect(
      calculateTimeseriesInterval(lowerBound.valueOf(), upperBound.valueOf(), minIntervalSeconds)
    ).to.be(10);
  });

  it('returns an interval of 30s when duration is 30m', () => {
    const upperBound = moment.utc();
    const lowerBound = upperBound.clone().subtract(30, 'minutes');
    const minIntervalSeconds = 10;

    expect(
      calculateTimeseriesInterval(lowerBound.valueOf(), upperBound.valueOf(), minIntervalSeconds)
    ).to.be(30);
  });

  it('returns an interval of 30s when duration is 1h', () => {
    const upperBound = moment.utc();
    const lowerBound = upperBound.clone().subtract(1, 'hour');
    const minIntervalSeconds = 10;

    expect(
      calculateTimeseriesInterval(lowerBound.valueOf(), upperBound.valueOf(), minIntervalSeconds)
    ).to.be(30);
  });

  it('returns an interval of 1m when duration is 4h', () => {
    const upperBound = moment.utc();
    const lowerBound = upperBound.clone().subtract(4, 'hours');
    const minIntervalSeconds = 10;

    expect(
      calculateTimeseriesInterval(lowerBound.valueOf(), upperBound.valueOf(), minIntervalSeconds)
    ).to.be(60);
  });

  it('returns an interval of 5m when duration is 12h', () => {
    const upperBound = moment.utc();
    const lowerBound = upperBound.clone().subtract(12, 'hours');
    const minIntervalSeconds = 10;

    expect(
      calculateTimeseriesInterval(lowerBound.valueOf(), upperBound.valueOf(), minIntervalSeconds)
    ).to.be(5 * 60);
  });

  it('returns an interval of 10m when duration is 24h', () => {
    const upperBound = moment.utc();
    const lowerBound = upperBound.clone().subtract(24, 'hours');
    const minIntervalSeconds = 10;

    expect(
      calculateTimeseriesInterval(lowerBound.valueOf(), upperBound.valueOf(), minIntervalSeconds)
    ).to.be(10 * 60);
  });

  it('returns an interval of 1h when duration is 7d', () => {
    const upperBound = moment.utc();
    const lowerBound = upperBound.clone().subtract(7, 'days');
    const minIntervalSeconds = 10;

    expect(
      calculateTimeseriesInterval(lowerBound.valueOf(), upperBound.valueOf(), minIntervalSeconds)
    ).to.be(60 * 60);
  });

  it('returns an interval of 12h when duration is 30d', () => {
    const upperBound = moment.utc();
    const lowerBound = upperBound.clone().subtract(30, 'days');
    const minIntervalSeconds = 10;

    expect(
      calculateTimeseriesInterval(lowerBound.valueOf(), upperBound.valueOf(), minIntervalSeconds)
    ).to.be(12 * 60 * 60);
  });

  it('returns an interval of 12h when duration is 60d', () => {
    const upperBound = moment.utc();
    const lowerBound = upperBound.clone().subtract(60, 'days');
    const minIntervalSeconds = 10;

    expect(
      calculateTimeseriesInterval(lowerBound.valueOf(), upperBound.valueOf(), minIntervalSeconds)
    ).to.be(12 * 60 * 60);
  });

  it('returns an interval of 12h when duration is 90d', () => {
    const upperBound = moment.utc();
    const lowerBound = upperBound.clone().subtract(90, 'days');
    const minIntervalSeconds = 10;

    expect(
      calculateTimeseriesInterval(lowerBound.valueOf(), upperBound.valueOf(), minIntervalSeconds)
    ).to.be(12 * 60 * 60);
  });

  it('returns an interval of 1d when duration is 6mo', () => {
    const upperBound = moment.utc();
    const lowerBound = upperBound.clone().subtract(6, 'months');
    const minIntervalSeconds = 10;

    expect(
      calculateTimeseriesInterval(lowerBound.valueOf(), upperBound.valueOf(), minIntervalSeconds)
    ).to.be(24 * 60 * 60);
  });

  it('returns an interval of 1d when duration is 1y', () => {
    const upperBound = moment.utc();
    const lowerBound = upperBound.clone().subtract(1, 'year');
    const minIntervalSeconds = 10;

    expect(
      calculateTimeseriesInterval(lowerBound.valueOf(), upperBound.valueOf(), minIntervalSeconds)
    ).to.be(24 * 60 * 60);
  });

  it('returns an interval of 7d when duration is 2y', () => {
    const upperBound = moment.utc();
    const lowerBound = upperBound.clone().subtract(2, 'years');
    const minIntervalSeconds = 10;

    expect(
      calculateTimeseriesInterval(lowerBound.valueOf(), upperBound.valueOf(), minIntervalSeconds)
    ).to.be(7 * 24 * 60 * 60);
  });

  it('returns an interval of 7d when duration is 5y', () => {
    const upperBound = moment.utc();
    const lowerBound = upperBound.clone().subtract(5, 'years');
    const minIntervalSeconds = 10;

    expect(
      calculateTimeseriesInterval(lowerBound.valueOf(), upperBound.valueOf(), minIntervalSeconds)
    ).to.be(7 * 24 * 60 * 60);
  });
});
