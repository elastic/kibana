/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import mockOverallSwimlane from './__mocks__/mock_overall_swimlane.json';

import { mount } from 'enzyme';
import React from 'react';

import { ExplorerSwimlane } from './explorer_swimlane';

describe('ExplorerSwimlane', () => {
  const mockAppState = {
    mlExplorerSwimlane: {},
    save: jest.fn()
  };

  const mockMlExplorerDashboardService = {
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
  };

  const mockMlTimeBuckets = jest.fn(() => ({
    setInterval: jest.fn(),
    getScaledDateFormat: jest.fn()
  }));

  const mockSwimlaneData = {};

  const mockedGetBBox = { x: 0, y: -11.5, width: 12.1875, height: 14.5 };
  const originalGetBBox = SVGElement.prototype.getBBox;
  beforeEach(() => SVGElement.prototype.getBBox = () => mockedGetBBox);
  afterEach(() => (SVGElement.prototype.getBBox = originalGetBBox));

  test('Minimal initialization', () => {
    const wrapper = mount(<ExplorerSwimlane
      appState={mockAppState}
      lanes={[]}
      mlExplorerDashboardService={mockMlExplorerDashboardService}
      MlTimeBuckets={mockMlTimeBuckets}
      swimlaneData={mockSwimlaneData}
    />);

    expect(wrapper.html()).toBe(
      `<div class="ml-swimlanes"><div class="time-tick-labels"><svg height="25">` +
      `<g class="x axis"><path class="domain" d="MNaN,6V0H0V6"></path></g></svg></div></div>`
    );
  });

  test('Overall swimlane', () => {
    const wrapper = mount(<ExplorerSwimlane
      appState={mockAppState}
      lanes={mockOverallSwimlane}
      mlExplorerDashboardService={mockMlExplorerDashboardService}
      MlTimeBuckets={mockMlTimeBuckets}
      swimlaneData={mockSwimlaneData}
    />);

    expect(wrapper.html()).toMatchSnapshot();
  });

});
