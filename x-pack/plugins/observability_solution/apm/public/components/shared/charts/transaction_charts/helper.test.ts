/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getResponseTimeTickFormatter, getMaxY } from './helper';

import { TimeSeries, Coordinate } from '../../../../../typings/timeseries';
import { getDurationFormatter, toMicroseconds } from '../../../../../common/utils/formatters';

describe('transaction chart helper', () => {
  describe('getResponseTimeTickFormatter', () => {
    it('formattes time tick in minutes', () => {
      const formatter = getDurationFormatter(toMicroseconds(11, 'minutes'));
      const timeTickFormatter = getResponseTimeTickFormatter(formatter);
      expect(timeTickFormatter(toMicroseconds(60, 'seconds'))).toEqual('1.0 min');
    });

    it('formattes time tick in seconds', () => {
      const formatter = getDurationFormatter(toMicroseconds(11, 'seconds'));
      const timeTickFormatter = getResponseTimeTickFormatter(formatter);
      expect(timeTickFormatter(toMicroseconds(6, 'seconds'))).toEqual('6.0 s');
    });
  });

  describe('getMaxY', () => {
    it('returns zero when empty time series', () => {
      expect(getMaxY([])).toEqual(0);
    });

    it('returns zero for invalid y coordinate', () => {
      const timeSeries = [{ data: [{ x: 1 }, { x: 2 }, { x: 3, y: -1 }] }] as unknown as Array<
        TimeSeries<Coordinate>
      >;
      expect(getMaxY(timeSeries)).toEqual(0);
    });

    it('returns the max y coordinate', () => {
      const timeSeries = [
        {
          data: [
            { x: 1, y: 10 },
            { x: 2, y: 5 },
            { x: 3, y: 1 },
          ],
        },
      ] as unknown as Array<TimeSeries<Coordinate>>;
      expect(getMaxY(timeSeries)).toEqual(10);
    });
  });
});
