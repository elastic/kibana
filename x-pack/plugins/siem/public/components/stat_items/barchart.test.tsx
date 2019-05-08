/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, ReactWrapper } from 'enzyme';
import * as React from 'react';

import { BarChartBaseComponent, BarChartWithCustomPrompt } from './barchart';
import { BarChartData } from '.';

describe('BarChartBaseComponent', () => {
  let wrapper: ReactWrapper;
  const mockBarChartData: BarChartData[] = [
    { key: 'uniqueSourceIps', value: [{ x: 1714, y: 'uniqueSourceIps' }], color: '#DB1374' },
    {
      key: 'uniqueDestinationIps',
      value: [{ x: 2354, y: 'uniqueDestinationIps' }],
      color: '#490092',
    },
  ];

  describe('render', () => {
    beforeAll(() => {
      wrapper = mount(<BarChartBaseComponent height={100} width={120} data={mockBarChartData} />);
    });

    it('should render two area series', () => {
      expect(wrapper.find('EuiBarSeries')).toHaveLength(2);
    });

    it('should render a customized x-asix', () => {
      expect(wrapper.find('EuiXAxis')).toHaveLength(1);
    });

    it('should render a customized y-asix', () => {
      expect(wrapper.find('EuiYAxis')).toHaveLength(1);
    });
  });

  describe('no render', () => {
    beforeAll(() => {
      wrapper = mount(<BarChartBaseComponent height={null} width={null} data={mockBarChartData} />);
    });

    it('should not render without height and width', () => {
      expect(wrapper.find('SeriesChart')).toHaveLength(0);
    });
  });
});

describe.each([
  [
    [
      { key: 'uniqueSourceIps', value: [{ x: 1714, y: 'uniqueSourceIps' }], color: '#DB1374' },
      {
        key: 'uniqueDestinationIps',
        value: [{ x: 2354, y: 'uniqueDestinationIps' }],
        color: '#490092',
      },
    ],
  ],
  [
    [
      { key: 'uniqueSourceIps', value: [{ x: 1714, y: '' }], color: '#DB1374' },
      {
        key: 'uniqueDestinationIps',
        value: [{ x: 2354, y: '' }],
        color: '#490092',
      },
    ],
  ],
  [
    [
      { key: 'uniqueSourceIps', value: [{ x: 0, y: 'uniqueSourceIps' }], color: '#DB1374' },
      {
        key: 'uniqueDestinationIps',
        value: [{ x: 0, y: 'uniqueDestinationIps' }],
        color: '#490092',
      },
    ],
  ],
])('BarChartWithCustomPrompt', mockBarChartData => {
  let wrapper: ReactWrapper;
  describe('renders barchart', () => {
    beforeAll(() => {
      wrapper = mount(
        <BarChartWithCustomPrompt height={100} width={120} data={mockBarChartData} />
      );
    });

    it('render BarChartBaseComponent', () => {
      expect(wrapper.find('[data-test-subj="stat-bar-chart"]').first()).toHaveLength(1);
      expect(wrapper.find('ChartHolder')).toHaveLength(0);
    });
  });
});

describe.each([
  [],
  null,
  [
    [
      { key: 'uniqueSourceIps', color: '#DB1374' },
      {
        key: 'uniqueDestinationIps',
        color: '#490092',
      },
    ],
  ],
  [
    [
      { key: 'uniqueSourceIps', value: [], color: '#DB1374' },
      {
        key: 'uniqueDestinationIps',
        value: [],
        color: '#490092',
      },
    ],
  ],
  [
    [
      { key: 'uniqueSourceIps', value: [{}], color: '#DB1374' },
      {
        key: 'uniqueDestinationIps',
        value: [{}],
        color: '#490092',
      },
    ],
  ],
  [
    [
      { key: 'uniqueSourceIps', value: [{ x: null, y: 'uniqueSourceIps' }], color: '#DB1374' },
      {
        key: 'uniqueDestinationIps',
        value: [{ x: 2354, y: 'uniqueDestinationIps' }],
        color: '#490092',
      },
    ],
  ],
  [
    [
      { key: 'uniqueSourceIps', value: [{ x: null, y: 'uniqueSourceIps' }], color: '#DB1374' },
      {
        key: 'uniqueDestinationIps',
        value: [{ x: null, y: 'uniqueDestinationIps' }],
        color: '#490092',
      },
    ],
  ],
])('renders prompt', (data: BarChartData[] | [] | null | undefined) => {
  let wrapper: ReactWrapper;
  beforeAll(() => {
    wrapper = mount(<BarChartWithCustomPrompt height={100} width={120} data={data} />);
  });

  it('render Chart Holder', () => {
    expect(wrapper.find('[data-test-subj="stat-bar-chart"]')).toHaveLength(0);
    expect(wrapper.find('ChartHolder')).toHaveLength(1);
  });
});
