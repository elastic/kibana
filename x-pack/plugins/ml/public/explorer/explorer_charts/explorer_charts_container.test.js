/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { chartData } from './__mocks__/mock_chart_data';
import seriesConfig from './__mocks__/mock_series_config_filebeat.json';

// Mock TimeBuckets and mlFieldFormatService, they don't play well
// with the jest based test setup yet.
jest.mock('ui/time_buckets', () => ({
  TimeBuckets: function () {
    this.setBounds = jest.fn();
    this.setInterval = jest.fn();
    this.getScaledDateFormat = jest.fn();
  }
}));
jest.mock('../../services/field_format_service', () => ({
  mlFieldFormatService: {
    getFieldFormat: jest.fn()
  }
}));
jest.mock('ui/chrome', () => ({
  getBasePath: (path) => path,
  getUiSettingsClient: () => ({
    get: () => null
  }),
}));

import { shallow } from 'enzyme';
import React from 'react';

import { chartLimits } from '../../util/chart_utils';
import { mlChartTooltipService } from '../../components/chart_tooltip/chart_tooltip_service';

import { ExplorerChartsContainer } from './explorer_charts_container';

describe('ExplorerChartsContainer', () => {
  const mlSelectSeverityServiceMock = {
    state: {
      get: () => ({
        val: ''
      })
    }
  };

  const mockedGetBBox = { x: 0, y: -11.5, width: 12.1875, height: 14.5 };
  const originalGetBBox = SVGElement.prototype.getBBox;
  beforeEach(() => SVGElement.prototype.getBBox = () => mockedGetBBox);
  afterEach(() => (SVGElement.prototype.getBBox = originalGetBBox));

  test('Minimal Initialization', () => {
    const wrapper = shallow(<ExplorerChartsContainer
      seriesToPlot={[]}
      layoutCellsPerChart={12}
      tooManyBuckets={false}
      mlSelectSeverityService={mlSelectSeverityServiceMock}
      mlChartTooltipService={mlChartTooltipService}
    />);

    expect(wrapper.html()).toBe('<div class="explorer-charts"></div>');
  });

  test('Initialization with chart data', () => {
    const wrapper = shallow(<ExplorerChartsContainer
      seriesToPlot={[{
        ...seriesConfig,
        chartData,
        chartLimits: chartLimits(chartData)
      }]}
      layoutCellsPerChart={12}
      tooManyBuckets={false}
      mlSelectSeverityService={mlSelectSeverityServiceMock}
      mlChartTooltipService={mlChartTooltipService}
    />);

    // Only do a snapshot of the label section, the included
    // ExplorerChart component does that in its own tests anyway.
    expect(wrapper.find('.explorer-chart-label')).toMatchSnapshot();
  });
});
