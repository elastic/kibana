/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InvalidEsCalendarIntervalError } from './invalid_es_calendar_interval_error';
import { InvalidEsIntervalFormatError } from './invalid_es_interval_format_error';
import { parseEsInterval } from './parse_es_interval';

describe('parseEsInterval', () => {
  it('should correctly parse an interval containing unit and single value', () => {
    expect(parseEsInterval('1ms')).toEqual({ value: 1, unit: 'ms', type: 'fixed' });
    expect(parseEsInterval('1s')).toEqual({ value: 1, unit: 's', type: 'fixed' });
    expect(parseEsInterval('1m')).toEqual({ value: 1, unit: 'm', type: 'calendar' });
    expect(parseEsInterval('1h')).toEqual({ value: 1, unit: 'h', type: 'calendar' });
    expect(parseEsInterval('1d')).toEqual({ value: 1, unit: 'd', type: 'calendar' });
    expect(parseEsInterval('1w')).toEqual({ value: 1, unit: 'w', type: 'calendar' });
    expect(parseEsInterval('1M')).toEqual({ value: 1, unit: 'M', type: 'calendar' });
    expect(parseEsInterval('1y')).toEqual({ value: 1, unit: 'y', type: 'calendar' });
  });

  it('should correctly parse an interval containing unit and multiple value', () => {
    expect(parseEsInterval('250ms')).toEqual({ value: 250, unit: 'ms', type: 'fixed' });
    expect(parseEsInterval('90s')).toEqual({ value: 90, unit: 's', type: 'fixed' });
    expect(parseEsInterval('60m')).toEqual({ value: 60, unit: 'm', type: 'fixed' });
    expect(parseEsInterval('12h')).toEqual({ value: 12, unit: 'h', type: 'fixed' });
    expect(parseEsInterval('7d')).toEqual({ value: 7, unit: 'd', type: 'fixed' });
  });

  it('should throw a InvalidEsCalendarIntervalError for intervals containing calendar unit and multiple value', () => {
    const intervals = ['4w', '12M', '10y'];
    expect.assertions(intervals.length);

    intervals.forEach((interval) => {
      try {
        parseEsInterval(interval);
      } catch (error) {
        expect(error instanceof InvalidEsCalendarIntervalError).toBe(true);
      }
    });
  });

  it('should throw a InvalidEsIntervalFormatError for invalid interval formats', () => {
    const intervals = ['1', 'h', '0m', '0.5h'];
    expect.assertions(intervals.length);

    intervals.forEach((interval) => {
      try {
        parseEsInterval(interval);
      } catch (error) {
        expect(error instanceof InvalidEsIntervalFormatError).toBe(true);
      }
    });
  });
});
