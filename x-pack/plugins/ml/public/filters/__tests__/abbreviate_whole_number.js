/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import ngMock from 'ng_mock';
import expect from 'expect.js';

let filter;

const init = function () {
  // Load the application
  ngMock.module('kibana');

  // Create the scope
  ngMock.inject(function ($filter) {
    filter = $filter('abbreviateWholeNumber');
  });
};

describe('ML - abbreviateWholeNumber filter', () => {

  beforeEach(function () {
    init();
  });

  it('should have an abbreviateWholeNumber filter', () => {
    expect(filter).to.not.be(null);
  });

  it('returns the correct format using default max digits', () => {
    expect(filter(1)).to.be(1);
    expect(filter(12)).to.be(12);
    expect(filter(123)).to.be(123);
    expect(filter(1234)).to.be('1k');
    expect(filter(12345)).to.be('12k');
    expect(filter(123456)).to.be('123k');
    expect(filter(1234567)).to.be('1m');
    expect(filter(12345678)).to.be('12m');
    expect(filter(123456789)).to.be('123m');
    expect(filter(1234567890)).to.be('1b');
    expect(filter(5555555555555.55)).to.be('6t');
  });

  it('returns the correct format using custom max digits', () => {
    expect(filter(1, 4)).to.be(1);
    expect(filter(12, 4)).to.be(12);
    expect(filter(123, 4)).to.be(123);
    expect(filter(1234, 4)).to.be(1234);
    expect(filter(12345, 4)).to.be('12k');
    expect(filter(123456, 6)).to.be(123456);
    expect(filter(1234567, 4)).to.be('1m');
    expect(filter(12345678, 3)).to.be('12m');
    expect(filter(123456789, 9)).to.be(123456789);
    expect(filter(1234567890, 3)).to.be('1b');
    expect(filter(5555555555555.55, 5)).to.be('6t');
  });

});
