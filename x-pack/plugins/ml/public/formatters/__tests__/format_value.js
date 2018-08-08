/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import expect from 'expect.js';
import moment from 'moment';
import { formatValue } from '../format_value';

describe('ML - formatValue formatter', () => {

  // Just check the return value is in the expected format, and
  // not the exact value as this will be timezone specific.
  it('correctly formats time_of_week value from numeric input', () => {
    const formattedValue = formatValue(1483228800, 'time_of_week');
    const result = moment(formattedValue, 'ddd hh:mm', true).isValid();
    expect(result).to.be(true);
  });

  it('correctly formats time_of_day value from numeric input', () => {
    const formattedValue = formatValue(1483228800, 'time_of_day');
    const result = moment(formattedValue, 'hh:mm', true).isValid();
    expect(result).to.be(true);
  });

  it('correctly formats number values from numeric input', () => {
    expect(formatValue(1483228800, 'mean')).to.be(1483228800);
    expect(formatValue(1234.5678, 'mean')).to.be(1234.6);
    expect(formatValue(0.00012345, 'mean')).to.be(0.000123);
    expect(formatValue(0, 'mean')).to.be(0);
    expect(formatValue(-0.12345, 'mean')).to.be(-0.123);
    expect(formatValue(-1234.5678, 'mean')).to.be(-1234.6);
    expect(formatValue(-100000.1, 'mean')).to.be(-100000);
  });

  it('correctly formats time_of_week value from array input', () => {
    const formattedValue = formatValue([1483228800], 'time_of_week');
    const result = moment(formattedValue, 'ddd hh:mm', true).isValid();
    expect(result).to.be(true);
  });

  it('correctly formats time_of_day value from array input', () => {
    const formattedValue = formatValue([1483228800], 'time_of_day');
    const result = moment(formattedValue, 'hh:mm', true).isValid();
    expect(result).to.be(true);
  });

  it('correctly formats number values from array input', () => {
    expect(formatValue([1483228800], 'mean')).to.be(1483228800);
    expect(formatValue([1234.5678], 'mean')).to.be(1234.6);
    expect(formatValue([0.00012345], 'mean')).to.be(0.000123);
    expect(formatValue([0], 'mean')).to.be(0);
    expect(formatValue([-0.12345], 'mean')).to.be(-0.123);
    expect(formatValue([-1234.5678], 'mean')).to.be(-1234.6);
    expect(formatValue([-100000.1], 'mean')).to.be(-100000);
  });

  it('correctly formats multi-valued array', () => {
    expect(formatValue([30.3, 26.2], 'lat_long')).to.be('[30.3,26.2]');
  });

});
