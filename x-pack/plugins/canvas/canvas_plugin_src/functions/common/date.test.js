/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import { functionWrapper } from '@kbn/presentation-util-plugin/common/lib';
import { getFunctionErrors } from '../../../i18n';
import { date } from './date';

const errors = getFunctionErrors().date;

describe('date', () => {
  const fn = functionWrapper(date);

  let clock;
  // stubbed date constructor to check current dates match when no args are passed in
  beforeEach(() => {
    clock = sinon.useFakeTimers();
  });

  afterEach(() => {
    clock.restore();
  });

  it('returns a date in ms from a date string with the provided format', () => {
    expect(fn(null, { value: '20111031', format: 'YYYYMMDD' })).toBe(1320019200000);
  });

  describe('args', () => {
    describe('value', () => {
      it('sets the date string to convert into ms', () => {
        expect(fn(null, { value: '2011-10-05T14:48:00.000Z' })).toBe(1317826080000);
      });

      it('defaults to current date (ms)', () => {
        expect(fn(null)).toBe(new Date().valueOf());
      });
    });

    describe('format', () => {
      it('sets the format to parse the date string', () => {
        expect(fn(null, { value: '20111031', format: 'YYYYMMDD' })).toBe(1320019200000);
      });

      it('defaults to ISO 8601 format', () => {
        expect(fn(null, { value: '2011-10-05T14:48:00.000Z' })).toBe(1317826080000);
      });

      it('throws when passing an invalid date string and format is not specified', () => {
        expect(() => fn(null, { value: '23/25/2014' })).toThrow(
          new RegExp(errors.invalidDateInput('23/25/2014').message)
        );
      });
    });
  });
});
