/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { mlChartTooltipService } from '../chart_tooltip_service';

describe('ML - mlChartTooltipService', () => {
  it('service API duck typing', () => {
    expect(mlChartTooltipService).to.be.an('object');
    expect(mlChartTooltipService.show).to.be.a('function');
    expect(mlChartTooltipService.hide).to.be.a('function');
  });

  it('should fail silently when target is not defined', () => {
    mlChartTooltipService.element = {};
    expect(() => {
      mlChartTooltipService.show('', undefined);
    }).to.not.throwError('Call to show() should fail silently.');
  });
});
