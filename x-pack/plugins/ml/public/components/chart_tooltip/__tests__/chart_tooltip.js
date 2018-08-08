/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import ngMock from 'ng_mock';
import expect from 'expect.js';

describe('ML - mlChartTooltipService', () => {
  let mlChartTooltipService;

  beforeEach(ngMock.module('kibana'));
  beforeEach(() => {
    ngMock.inject(function ($injector) {
      mlChartTooltipService = $injector.get('mlChartTooltipService');
    });
  });

  it('service API duck typing', () => {
    expect(mlChartTooltipService).to.be.an('object');
    expect(mlChartTooltipService.show).to.be.a('function');
    expect(mlChartTooltipService.hide).to.be.a('function');
  });

});
