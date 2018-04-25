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
    filter = $filter('metricChangeDescription');
  });
};

describe('ML - metricChangeDescription filter', () => {

  beforeEach(function () {
    init();
  });

  it('should have a metricChangeDescription filter', () => {
    expect(filter).to.not.be(null);
  });

  it('returns correct description if actual > typical', () => {
    expect(filter(1.01, 1)).to.be('<i class="fa fa-arrow-up" aria-hidden="true"></i> Unusually high');
    expect(filter(1.123, 1)).to.be('<i class="fa fa-arrow-up" aria-hidden="true"></i> 1.1x higher');
    expect(filter(2, 1)).to.be('<i class="fa fa-arrow-up" aria-hidden="true"></i> 2x higher');
    expect(filter(9.5, 1)).to.be('<i class="fa fa-arrow-up" aria-hidden="true"></i> 10x higher');
    expect(filter(1000, 1)).to.be('<i class="fa fa-arrow-up" aria-hidden="true"></i> More than 100x higher');
    expect(filter(1, 0)).to.be('<i class="fa fa-arrow-up" aria-hidden="true"></i> Unexpected non-zero value');
  });

  it('returns correct description if actual < typical', () => {
    expect(filter(1, 1.01)).to.be('<i class="fa fa-arrow-down" aria-hidden="true"></i> Unusually low');
    expect(filter(1, 1.123)).to.be('<i class="fa fa-arrow-down" aria-hidden="true"></i> 1.1x lower');
    expect(filter(1, 2)).to.be('<i class="fa fa-arrow-down" aria-hidden="true"></i> 2x lower');
    expect(filter(1, 9.5)).to.be('<i class="fa fa-arrow-down" aria-hidden="true"></i> 10x lower');
    expect(filter(1, 1000)).to.be('<i class="fa fa-arrow-down" aria-hidden="true"></i> More than 100x lower');
    expect(filter(0, 1)).to.be('<i class="fa fa-arrow-down" aria-hidden="true"></i> Unexpected zero value');
  });

});
