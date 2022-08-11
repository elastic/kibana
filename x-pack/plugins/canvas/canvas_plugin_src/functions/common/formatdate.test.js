/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { functionWrapper } from '@kbn/presentation-util-plugin/common/lib';
import { formatdate } from './formatdate';

describe('formatdate', () => {
  const fn = functionWrapper(formatdate);

  it('returns formatted date string from ms or ISO8601 string using the given format', () => {
    const testDate = new Date('2011-10-31T12:30:45Z').valueOf();
    expect(fn(testDate, { format: 'MM/DD/YYYY' })).toBe('10/31/2011');
  });

  describe('args', () => {
    describe('format', () => {
      it('sets the format of the returned date string', () => {
        const testDate = new Date('2013-03-12T08:03:27Z').valueOf();
        expect(fn(testDate, { format: 'MMMM Do YYYY, h:mm:ss a' })).toBe(
          'March 12th 2013, 8:03:27 am'
        );
        expect(fn(testDate, { format: 'MMM Do YY' })).toBe('Mar 12th 13');
      });

      it('defaults to ISO 8601 format', () => {
        const testDate = new Date('2018-01-08T20:15:59Z').valueOf();
        expect(fn(testDate)).toBe('2018-01-08T20:15:59.000Z');
      });
    });
  });
});
