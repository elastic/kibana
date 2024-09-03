/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import React from 'react';

import { TimeseriesChart } from './timeseries_chart';

jest.mock('../../../util/time_buckets_service', () => ({
  timeBucketsServiceFactory: function () {
    return { getTimeBuckets: jest.fn() };
  },
}));

jest.mock('../../../util/time_series_explorer_service', () => ({
  timeSeriesExplorerServiceFactory: function () {
    return {
      getAutoZoomDuration: jest.fn(),
      calculateAggregationInterval: jest.fn(),
      calculateInitialFocusRange: jest.fn(),
      calculateDefaultFocusRange: jest.fn(),
      processRecordScoreResults: jest.fn(),
      processMetricPlotResults: jest.fn(),
      processForecastResults: jest.fn(),
      findChartPointForAnomalyTime: jest.fn(),
      processDataForFocusAnomalies: jest.fn(),
      findChartPointForScheduledEvent: jest.fn(),
      processScheduledEventsForChart: jest.fn(),
      getFocusData: jest.fn(),
    };
  },
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
    tooltipService: {},
    sourceIndicesWithGeoFields: {},
  };
}

const kibanaReactContextMock = createKibanaReactContext({
  mlServices: {
    mlApiServices: {},
    mlResultsService: {},
  },
  notifications: { toasts: { addDanger: jest.fn(), addSuccess: jest.fn() } },
});

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

    const wrapper = mountWithIntl(
      <kibanaReactContextMock.Provider>
        <TimeseriesChart {...props} />
      </kibanaReactContextMock.Provider>
    );

    expect(wrapper.html()).toBe('<div class="ml-timeseries-chart-react"></div>');
  });
});
