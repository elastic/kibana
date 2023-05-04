/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

//import mockOverallSwimlaneData from './__mocks__/mock_overall_swimlane.json';

import moment from 'moment-timezone';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import React from 'react';

import { TimeseriesChart } from './timeseries_chart';

jest.mock('../../../util/time_buckets', () => ({
  TimeBuckets: function () {
    this.setBounds = jest.fn();
    this.setInterval = jest.fn();
    this.getScaledDateFormat = jest.fn();
  },
}));

jest.mock('../../../services/field_format_service', () => ({
  mlFieldFormatService: {},
}));

function getTimeseriesChartPropsMock() {
  return {
    contextChartSelected: jest.fn(),
    modelPlotEnabled: false,
    renderFocusChartOnly: false,
    showForecast: true,
    showModelBounds: true,
    svgWidth: 1600,
    timefilter: {},
  };
}

describe('TimeseriesChart', () => {
  const mockedGetBBox = { x: 0, y: -10, width: 40, height: 20 };
  const originalGetBBox = SVGElement.prototype.getBBox;
  beforeEach(() => {
    moment.tz.setDefault('UTC');
    SVGElement.prototype.getBBox = () => mockedGetBBox;
  });
  afterEach(() => {
    moment.tz.setDefault('Browser');
    SVGElement.prototype.getBBox = originalGetBBox;
  });

  test('Minimal initialization', () => {
    const props = getTimeseriesChartPropsMock();

    const wrapper = mountWithIntl(<TimeseriesChart {...props} />);

    expect(wrapper.html()).toBe(`<div class="ml-timeseries-chart-react"></div>`);
  });
});
