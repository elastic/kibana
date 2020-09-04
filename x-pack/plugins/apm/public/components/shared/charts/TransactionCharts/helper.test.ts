/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  getResponseTimeTickFormatter,
  getResponseTimeTooltipFormatter,
  getMaxY,
} from './helper';
import {
  getDurationFormatter,
  toMicroseconds,
} from '../../../../utils/formatters';
import { TimeSeries } from '../../../../../typings/timeseries';

describe('transaction chart helper', () => {
  describe('getResponseTimeTickFormatter', () => {
    it('formattes time tick in minutes', () => {
      const formatter = getDurationFormatter(toMicroseconds(11, 'minutes'));
      const timeTickFormatter = getResponseTimeTickFormatter(formatter);
      expect(timeTickFormatter(toMicroseconds(60, 'seconds'))).toEqual(
        '1.0 min'
      );
    });
    it('formattes time tick in seconds', () => {
      const formatter = getDurationFormatter(toMicroseconds(11, 'seconds'));
      const timeTickFormatter = getResponseTimeTickFormatter(formatter);
      expect(timeTickFormatter(toMicroseconds(6, 'seconds'))).toEqual('6.0 s');
    });
  });
  describe('getResponseTimeTooltipFormatter', () => {
    const formatter = getDurationFormatter(toMicroseconds(11, 'minutes'));
    const tooltipFormatter = getResponseTimeTooltipFormatter(formatter);
    it("doesn't format invalid y coordinate", () => {
      expect(tooltipFormatter({ x: 1, y: undefined })).toEqual('N/A');
      expect(tooltipFormatter({ x: 1, y: null })).toEqual('N/A');
    });
    it('formattes tooltip in minutes', () => {
      expect(
        tooltipFormatter({ x: 1, y: toMicroseconds(60, 'seconds') })
      ).toEqual('1.0 min');
    });
  });
  describe('getMaxY', () => {
    it('returns zero when empty time series', () => {
      expect(getMaxY([])).toEqual(0);
    });
    it('returns zero for invalid y coordinate', () => {
      const timeSeries = ([
        { data: [{ x: 1 }, { x: 2 }, { x: 3, y: -1 }] },
      ] as unknown) as TimeSeries[];
      expect(getMaxY(timeSeries)).toEqual(0);
    });
    it('returns the max y coordinate', () => {
      const timeSeries = ([
        {
          data: [
            { x: 1, y: 10 },
            { x: 2, y: 5 },
            { x: 3, y: 1 },
          ],
        },
      ] as unknown) as TimeSeries[];
      expect(getMaxY(timeSeries)).toEqual(10);
    });
  });
});
