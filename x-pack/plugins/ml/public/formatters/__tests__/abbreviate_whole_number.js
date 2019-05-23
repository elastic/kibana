/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import expect from '@kbn/expect';
import { abbreviateWholeNumber } from '../abbreviate_whole_number';

describe('ML - abbreviateWholeNumber formatter', () => {

  it('returns the correct format using default max digits', () => {
    expect(abbreviateWholeNumber({ value: 1 })).to.be(1);
    expect(abbreviateWholeNumber({ value: 12 })).to.be(12);
    expect(abbreviateWholeNumber({ value: 123 })).to.be(123);
    expect(abbreviateWholeNumber({ value: 1234 })).to.be('1k');
    expect(abbreviateWholeNumber({ value: 12345 })).to.be('12k');
    expect(abbreviateWholeNumber({ value: 123456 })).to.be('123k');
    expect(abbreviateWholeNumber({ value: 1234567 })).to.be('1m');
    expect(abbreviateWholeNumber({ value: 12345678 })).to.be('12m');
    expect(abbreviateWholeNumber({ value: 123456789 })).to.be('123m');
    expect(abbreviateWholeNumber({ value: 1234567890 })).to.be('1b');
    expect(abbreviateWholeNumber({ value: 5555555555555.55 })).to.be('6t');
  });

  it('returns the correct format using custom max digits', () => {
    expect(abbreviateWholeNumber({ value: 1, maxDigits: 4 })).to.be(1);
    expect(abbreviateWholeNumber({ value: 12, maxDigits: 4 })).to.be(12);
    expect(abbreviateWholeNumber({ value: 123, maxDigits: 4 })).to.be(123);
    expect(abbreviateWholeNumber({ value: 1234, maxDigits: 4 })).to.be(1234);
    expect(abbreviateWholeNumber({ value: 12345, maxDigits: 4 })).to.be('12k');
    expect(abbreviateWholeNumber({ value: 123456, maxDigits: 6 })).to.be(123456);
    expect(abbreviateWholeNumber({ value: 1234567, maxDigits: 4 })).to.be('1m');
    expect(abbreviateWholeNumber({ value: 12345678, maxDigits: 3 })).to.be('12m');
    expect(abbreviateWholeNumber({ value: 123456789, maxDigits: 9 })).to.be(123456789);
    expect(abbreviateWholeNumber({ value: 1234567890, maxDigits: 3 })).to.be('1b');
    expect(abbreviateWholeNumber({ value: 5555555555555.55, maxDigits: 5 })).to.be('6t');
  });

  it('returns the correct format using custom max digits and decimal format', () => {
    const useDecimalFormat = true;
    expect(abbreviateWholeNumber({ value: 1, maxDigits: 4, useDecimalFormat })).to.be(1);
    expect(abbreviateWholeNumber({ value: 12, maxDigits: 4, useDecimalFormat })).to.be(12);
    expect(abbreviateWholeNumber({ value: 123, maxDigits: 4, useDecimalFormat })).to.be(123);
    expect(abbreviateWholeNumber({ value: 1234, maxDigits: 4, useDecimalFormat })).to.be(1234);
    expect(abbreviateWholeNumber({ value: 12345, maxDigits: 4, useDecimalFormat })).to.be('12.3k');
    expect(abbreviateWholeNumber({ value: 123456, maxDigits: 6, useDecimalFormat })).to.be(123456);
    expect(abbreviateWholeNumber({ value: 1234567, maxDigits: 4, useDecimalFormat })).to.be('1.2m');
    expect(abbreviateWholeNumber({ value: 12345678, maxDigits: 3, useDecimalFormat })).to.be('12.3m');
    expect(abbreviateWholeNumber({ value: 123456789, maxDigits: 9, useDecimalFormat })).to.be(123456789);
    expect(abbreviateWholeNumber({ value: 1234567890, maxDigits: 3, useDecimalFormat })).to.be('1.2b');
    expect(abbreviateWholeNumber({ value: 5555555555555.55, maxDigits: 5, useDecimalFormat })).to.be('5.6t');
  });

});
