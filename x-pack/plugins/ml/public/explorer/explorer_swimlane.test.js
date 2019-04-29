/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import mockOverallSwimlaneData from './__mocks__/mock_overall_swimlane.json';

import moment from 'moment-timezone';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import React from 'react';

import { dragSelect$ } from './explorer_dashboard_service';
import { ExplorerSwimlane } from './explorer_swimlane';

jest.mock('ui/chrome', () => ({
  getBasePath: path => path,
  getUiSettingsClient: () => ({
    get: jest.fn()
  }),
}));

jest.mock('./explorer_dashboard_service', () => ({
  dragSelect$: {
    subscribe: jest.fn(() => ({
      unsubscribe: jest.fn(),
    })),
  },
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
    const swimlaneRenderDoneListener = jest.fn();

    const wrapper = mountWithIntl(<ExplorerSwimlane.WrappedComponent
      chartWidth={mockChartWidth}
      MlTimeBuckets={mocks.MlTimeBuckets}
      swimlaneCellClick={jest.fn()}
      swimlaneData={mocks.swimlaneData}
      swimlaneType="overall"
      swimlaneRenderDoneListener={swimlaneRenderDoneListener}
    />);

    expect(wrapper.html()).toBe(
      `<div class="ml-swimlanes ml-swimlane-overall"><div class="time-tick-labels"><svg width="${mockChartWidth}" height="25">` +
      `<g class="x axis"><path class="domain" d="MNaN,6V0H0V6"></path></g></svg></div></div>`
    );

    // test calls to mock functions
    expect(dragSelect$.subscribe.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(wrapper.instance().dragSelectSubscriber.unsubscribe.mock.calls).toHaveLength(0);
    expect(mocks.MlTimeBuckets.mockMethods.setInterval.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(mocks.MlTimeBuckets.mockMethods.getScaledDateFormat.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(swimlaneRenderDoneListener.mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  test('Overall swimlane', () => {
    const mocks = getExplorerSwimlaneMocks();
    const swimlaneRenderDoneListener = jest.fn();

    const wrapper = mountWithIntl(<ExplorerSwimlane.WrappedComponent
      chartWidth={mockChartWidth}
      MlTimeBuckets={mocks.MlTimeBuckets}
      swimlaneCellClick={jest.fn()}
      swimlaneData={mockOverallSwimlaneData}
      swimlaneType="overall"
      swimlaneRenderDoneListener={swimlaneRenderDoneListener}
    />);

    expect(wrapper.html()).toMatchSnapshot();

    // test calls to mock functions
    expect(dragSelect$.subscribe.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(wrapper.instance().dragSelectSubscriber.unsubscribe.mock.calls).toHaveLength(0);
    expect(mocks.MlTimeBuckets.mockMethods.setInterval.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(mocks.MlTimeBuckets.mockMethods.getScaledDateFormat.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(swimlaneRenderDoneListener.mock.calls.length).toBeGreaterThanOrEqual(1);
  });
});
