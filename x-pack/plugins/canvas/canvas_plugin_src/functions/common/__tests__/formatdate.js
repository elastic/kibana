/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { formatdate } from '../formatdate';
import { functionWrapper } from '../../../../__tests__/helpers/function_wrapper';

describe('formatdate', () => {
  const fn = functionWrapper(formatdate);

  it('returns formatted date string from ms or ISO8601 string using the given format', () => {
    const testDate = new Date('2011-10-31T12:30:45Z').valueOf();
    expect(fn(testDate, { format: 'MM/DD/YYYY' })).to.be('10/31/2011');
  });

  describe('args', () => {
    describe('format', () => {
      it('sets the format of the returned date string', () => {
        const testDate = new Date('2013-03-12T08:03:27Z').valueOf();
        expect(fn(testDate, { format: 'MMMM Do YYYY, h:mm:ss a' })).to.be(
          'March 12th 2013, 8:03:27 am'
        );
        expect(fn(testDate, { format: 'MMM Do YY' })).to.be('Mar 12th 13');
      });

      it('defaults to ISO 8601 format', () => {
        const testDate = new Date('2018-01-08T20:15:59Z').valueOf();
        expect(fn(testDate)).to.be('2018-01-08T20:15:59.000Z');
      });
    });
  });
});
