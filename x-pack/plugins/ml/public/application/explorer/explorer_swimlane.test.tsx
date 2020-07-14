/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import mockOverallSwimlaneData from './__mocks__/mock_overall_swimlane.json';

import moment from 'moment-timezone';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import React from 'react';

import { ExplorerSwimlane } from './explorer_swimlane';
import { TimeBuckets as TimeBucketsClass } from '../util/time_buckets';
import { ChartTooltipService } from '../components/chart_tooltip';
import { OverallSwimlaneData } from './explorer_utils';

jest.mock('d3', () => {
  const original = jest.requireActual('d3');

  return {
    ...original,
    transform: jest.fn().mockReturnValue({
      translate: jest.fn().mockReturnValue(0),
    }),
  };
});

jest.mock('@elastic/eui', () => {
  return {
    htmlIdGenerator: jest.fn(() => {
      return jest.fn(() => {
        return 'test-gen-id';
      });
    }),
  };
});

function getExplorerSwimlaneMocks() {
  const swimlaneData = ({ laneLabels: [] } as unknown) as OverallSwimlaneData;

  const timeBuckets = ({
    setInterval: jest.fn(),
    getScaledDateFormat: jest.fn(),
  } as unknown) as InstanceType<typeof TimeBucketsClass>;

  const tooltipService = ({
    show: jest.fn(),
    hide: jest.fn(),
  } as unknown) as ChartTooltipService;

  return {
    timeBuckets,
    swimlaneData,
    tooltipService,
    parentRef: {} as React.RefObject<HTMLDivElement>,
  };
}

const mockChartWidth = 800;

describe('ExplorerSwimlane', () => {
  const mockedGetBBox = { x: 0, y: -11.5, width: 12.1875, height: 14.5 } as DOMRect;
  // @ts-ignore
  const originalGetBBox = SVGElement.prototype.getBBox;
  beforeEach(() => {
    moment.tz.setDefault('UTC');
    // @ts-ignore
    SVGElement.prototype.getBBox = () => mockedGetBBox;
  });
  afterEach(() => {
    moment.tz.setDefault('Browser');
    // @ts-ignore
    SVGElement.prototype.getBBox = originalGetBBox;
  });

  test('Minimal initialization', () => {
    const mocks = getExplorerSwimlaneMocks();

    const wrapper = mountWithIntl(
      <ExplorerSwimlane
        chartWidth={mockChartWidth}
        timeBuckets={mocks.timeBuckets}
        onCellsSelection={jest.fn()}
        swimlaneData={mocks.swimlaneData}
        swimlaneType="overall"
        tooltipService={mocks.tooltipService}
        parentRef={mocks.parentRef}
      />
    );

    expect(wrapper.html()).toBe(
      '<div class="mlExplorerSwimlane"><div class="ml-swimlanes ml-swimlane-overall" id="test-gen-id"><div class="time-tick-labels"><svg width="800" height="25"><g class="x axis"><path class="domain" d="MNaN,6V0H0V6"></path></g></svg></div></div></div>'
    );

    // test calls to mock functions
    // @ts-ignore
    expect(mocks.timeBuckets.setInterval.mock.calls.length).toBeGreaterThanOrEqual(1);
    // @ts-ignore
    expect(mocks.timeBuckets.getScaledDateFormat.mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  test('Overall swimlane', () => {
    const mocks = getExplorerSwimlaneMocks();

    const wrapper = mountWithIntl(
      <ExplorerSwimlane
        chartWidth={mockChartWidth}
        timeBuckets={mocks.timeBuckets}
        onCellsSelection={jest.fn()}
        swimlaneData={mockOverallSwimlaneData}
        swimlaneType="overall"
        tooltipService={mocks.tooltipService}
        parentRef={mocks.parentRef}
      />
    );

    expect(wrapper.html()).toMatchSnapshot();

    // test calls to mock functions
    // @ts-ignore
    expect(mocks.timeBuckets.setInterval.mock.calls.length).toBeGreaterThanOrEqual(1);
    // @ts-ignore
    expect(mocks.timeBuckets.getScaledDateFormat.mock.calls.length).toBeGreaterThanOrEqual(1);
  });
});
