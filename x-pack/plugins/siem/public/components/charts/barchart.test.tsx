/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, ReactWrapper } from 'enzyme';
import * as React from 'react';

import { BarChartBaseComponent, BarChartWithCustomPrompt } from './barchart';
import { ChartConfigsData } from './common';

describe('BarChartBaseComponent', () => {
  let wrapper: ReactWrapper;
  const mockBarChartData: ChartConfigsData[] = [
    {
      key: 'uniqueSourceIps',
      value: [{ y: 1714, x: 'uniqueSourceIps', g: 'uniqueSourceIps' }],
      color: '#DB1374',
    },
    {
      key: 'uniqueDestinationIps',
      value: [{ y: 2354, x: 'uniqueDestinationIps', g: 'uniqueDestinationIps' }],
      color: '#490092',
    },
  ];

  describe('render', () => {
    beforeAll(() => {
      wrapper = mount(<BarChartBaseComponent height={100} width={120} data={mockBarChartData} />);
    });

    it('should render two bar series', () => {
      expect(wrapper.find('Chart')).toHaveLength(1);
    });
  });

  describe('no render', () => {
    beforeAll(() => {
      wrapper = mount(<BarChartBaseComponent height={null} width={null} data={mockBarChartData} />);
    });

    it('should not render without height and width', () => {
      expect(wrapper.find('Chart')).toHaveLength(0);
    });
  });
});

describe.each([
  [
    [
      { key: 'uniqueSourceIps', value: [{ y: 1714, x: 'uniqueSourceIps' }], color: '#DB1374' },
      {
        key: 'uniqueDestinationIps',
        value: [{ y: 2354, x: 'uniqueDestinationIps' }],
        color: '#490092',
      },
    ],
  ],
  [
    [
      { key: 'uniqueSourceIps', value: [{ y: 1714, x: '' }], color: '#DB1374' },
      {
        key: 'uniqueDestinationIps',
        value: [{ y: 2354, x: '' }],
        color: '#490092',
      },
    ],
  ],
  [
    [
      { key: 'uniqueSourceIps', value: [{ y: 1714, x: 'uniqueSourceIps' }], color: '#DB1374' },
      {
        key: 'uniqueDestinationIps',
        value: [{ y: 0, x: 'uniqueDestinationIps' }],
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
      expect(wrapper.find('Chart')).toHaveLength(1);
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
      { key: 'uniqueSourceIps', value: [{ y: 0, x: 'uniqueSourceIps' }], color: '#DB1374' },
      {
        key: 'uniqueDestinationIps',
        value: [{ y: 0, x: 'uniqueDestinationIps' }],
        color: '#490092',
      },
    ],
  ],
  [
    [
      { key: 'uniqueSourceIps', value: [{ y: null, x: 'uniqueSourceIps' }], color: '#DB1374' },
      {
        key: 'uniqueDestinationIps',
        value: [{ y: 2354, x: 'uniqueDestinationIps' }],
        color: '#490092',
      },
    ],
  ],
  [
    [
      { key: 'uniqueSourceIps', value: [{ y: null, x: 'uniqueSourceIps' }], color: '#DB1374' },
      {
        key: 'uniqueDestinationIps',
        value: [{ y: null, x: 'uniqueDestinationIps' }],
        color: '#490092',
      },
    ],
  ],
])('renders prompt', (data: ChartConfigsData[] | [] | null | undefined) => {
  let wrapper: ReactWrapper;
  beforeAll(() => {
    wrapper = mount(<BarChartWithCustomPrompt height={100} width={120} data={data} />);
  });

  it('render Chart Holder', () => {
    expect(wrapper.find('Chart')).toHaveLength(0);
    expect(wrapper.find('ChartHolder')).toHaveLength(1);
  });
});
