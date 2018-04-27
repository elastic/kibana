/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import ngMock from 'ng_mock';
import expect from 'expect.js';
import moment from 'moment';

let filter;

const init = function () {
  // Load the application
  ngMock.module('kibana');

  // Create the scope
  ngMock.inject(function ($filter) {
    filter = $filter('formatValue');
  });
};

describe('ML - formatValue filter', () => {

  beforeEach(function () {
    init();
  });

  it('should have a formatValue filter', () => {
    expect(filter).to.not.be(null);
  });

  // Just check the return value is in the expected format, and
  // not the exact value as this will be timezone specific.
  it('correctly formats time_of_week value from numeric input', () => {
    const formattedValue = filter(1483228800, 'time_of_week');
    const result = moment(formattedValue, 'ddd hh:mm', true).isValid();
    expect(result).to.be(true);
  });

  it('correctly formats time_of_day value from numeric input', () => {
    const formattedValue = filter(1483228800, 'time_of_day');
    const result = moment(formattedValue, 'hh:mm', true).isValid();
    expect(result).to.be(true);
  });

  it('correctly formats number values from numeric input', () => {
    expect(filter(1483228800, 'mean')).to.be(1483228800);
    expect(filter(1234.5678, 'mean')).to.be(1234.6);
    expect(filter(0.00012345, 'mean')).to.be(0.000123);
    expect(filter(0, 'mean')).to.be(0);
    expect(filter(-0.12345, 'mean')).to.be(-0.123);
    expect(filter(-1234.5678, 'mean')).to.be(-1234.6);
    expect(filter(-100000.1, 'mean')).to.be(-100000);
  });

  it('correctly formats time_of_week value from array input', () => {
    const formattedValue = filter([1483228800], 'time_of_week');
    const result = moment(formattedValue, 'ddd hh:mm', true).isValid();
    expect(result).to.be(true);
  });

  it('correctly formats time_of_day value from array input', () => {
    const formattedValue = filter([1483228800], 'time_of_day');
    const result = moment(formattedValue, 'hh:mm', true).isValid();
    expect(result).to.be(true);
  });

  it('correctly formats number values from array input', () => {
    expect(filter([1483228800], 'mean')).to.be(1483228800);
    expect(filter([1234.5678], 'mean')).to.be(1234.6);
    expect(filter([0.00012345], 'mean')).to.be(0.000123);
    expect(filter([0], 'mean')).to.be(0);
    expect(filter([-0.12345], 'mean')).to.be(-0.123);
    expect(filter([-1234.5678], 'mean')).to.be(-1234.6);
    expect(filter([-100000.1], 'mean')).to.be(-100000);
  });

  it('correctly formats multi-valued array', () => {
    const result = filter([500, 1000], 'mean');
    expect(result instanceof Array).to.be(true);
    expect(result.length).to.be(2);
    expect(result[0]).to.be(500);
    expect(result[1]).to.be(1000);
  });

});
