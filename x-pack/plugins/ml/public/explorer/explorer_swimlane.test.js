/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import mockOverallSwimlaneData from './__mocks__/mock_overall_swimlane.json';

import moment from 'moment-timezone';
import { mount } from 'enzyme';
import React from 'react';

import { mlExplorerDashboardService } from './explorer_dashboard_service';
import { ExplorerSwimlane } from './explorer_swimlane';

jest.mock('ui/chrome', () => ({
  getBasePath: path => path,
  getUiSettingsClient: () => ({
    get: jest.fn()
  }),
}));

jest.mock('./explorer_dashboard_service', () => ({
  mlExplorerDashboardService: {
    allowCellRangeSelection: false,
    dragSelect: {
      watch: jest.fn(),
      unwatch: jest.fn()
    },
    swimlaneCellClick: {
      changed: jest.fn()
    },
    swimlaneRenderDone: {
      changed: jest.fn()
    }
  }
}));

function getExplorerSwimlaneMocks() {
  const MlTimeBucketsMethods = {
    setInterval: jest.fn(),
    getScaledDateFormat: jest.fn()
  };
  const MlTimeBuckets = jest.fn(() => MlTimeBucketsMethods);
  MlTimeBuckets.mockMethods = MlTimeBucketsMethods;

  const swimlaneData = { laneLabels: [] };

  return {
    MlTimeBuckets,
    swimlaneData
  };
}

const mockChartWidth = 800;

describe('ExplorerSwimlane', () => {
  const mockedGetBBox = { x: 0, y: -11.5, width: 12.1875, height: 14.5 };
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
    const mocks = getExplorerSwimlaneMocks();

    const wrapper = mount(<ExplorerSwimlane
      chartWidth={mockChartWidth}
      MlTimeBuckets={mocks.MlTimeBuckets}
      swimlaneData={mocks.swimlaneData}
      swimlaneType="overall"
    />);

    expect(wrapper.html()).toBe(
      `<div class="ml-swimlanes"><div class="time-tick-labels"><svg width="${mockChartWidth}" height="25">` +
      `<g class="x axis"><path class="domain" d="MNaN,6V0H0V6"></path></g></svg></div></div>`
    );

    // test calls to mock functions
    expect(mlExplorerDashboardService.swimlaneRenderDone.changed.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(mlExplorerDashboardService.dragSelect.watch.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(mlExplorerDashboardService.dragSelect.unwatch.mock.calls).toHaveLength(0);
    expect(mlExplorerDashboardService.swimlaneCellClick.changed.mock.calls).toHaveLength(0);
    expect(mocks.MlTimeBuckets.mockMethods.setInterval.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(mocks.MlTimeBuckets.mockMethods.getScaledDateFormat.mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  test('Overall swimlane', () => {
    const mocks = getExplorerSwimlaneMocks();

    const wrapper = mount(<ExplorerSwimlane
      chartWidth={mockChartWidth}
      MlTimeBuckets={mocks.MlTimeBuckets}
      swimlaneData={mockOverallSwimlaneData}
      swimlaneType="overall"
    />);

    expect(wrapper.html()).toMatchSnapshot();

    // test calls to mock functions
    expect(mlExplorerDashboardService.swimlaneRenderDone.changed.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(mlExplorerDashboardService.dragSelect.watch.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(mlExplorerDashboardService.dragSelect.unwatch.mock.calls).toHaveLength(0);
    expect(mlExplorerDashboardService.swimlaneCellClick.changed.mock.calls).toHaveLength(0);
    expect(mocks.MlTimeBuckets.mockMethods.setInterval.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(mocks.MlTimeBuckets.mockMethods.getScaledDateFormat.mock.calls.length).toBeGreaterThanOrEqual(1);
  });
});
