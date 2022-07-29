/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';
import { dateFormatter } from './dates';
import { EMPTY_VALUE } from '../../../common/constants';

const mockValidStringDate = '1 Jan 2022 00:00:00 GMT';
const mockInvalidStringDate = 'invalid date';
const mockTimeZone = 'Europe/London';
const mockDateFormat = 'MMM Do YY';

moment.suppressDeprecationWarnings = true;

describe('dates', () => {
  describe('fullDateFormatter', () => {
    it('should return date string for valid string date', () => {
      expect(dateFormatter(mockValidStringDate, mockTimeZone)).toEqual('2022-01-01T00:00:00Z');
    });

    it('should return date string for valid moment date', () => {
      const date = moment(mockValidStringDate);
      expect(dateFormatter(date, mockTimeZone)).toEqual('2022-01-01T00:00:00Z');
    });

    it(`should return date string in ${mockDateFormat} format`, () => {
      const date = moment(mockValidStringDate);
      expect(dateFormatter(date, mockTimeZone, mockDateFormat)).toEqual('Jan 1st 22');
    });

    it('should return EMPTY_VALUE for invalid string date', () => {
      expect(dateFormatter(mockInvalidStringDate, mockTimeZone)).toEqual(EMPTY_VALUE);
    });

    it('should return EMPTY_VALUE for invalid moment date', () => {
      const date = moment(mockInvalidStringDate);
      expect(dateFormatter(date, mockTimeZone)).toEqual(EMPTY_VALUE);
    });
  });
});
