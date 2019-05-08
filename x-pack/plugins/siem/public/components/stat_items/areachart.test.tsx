/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, ReactWrapper } from 'enzyme';
import * as React from 'react';

import { AreaChartBaseComponent, AreaChartWithCustomPrompt } from './areachart';
import { AreaChartData } from '.';

describe('AreaChartBaseComponent', () => {
  let wrapper: ReactWrapper;
  const mockAreaChartData: AreaChartData[] = [
    {
      key: 'uniqueSourceIpsHistogram',
      value: [
        { x: 1556686800000, y: 580213 },
        { x: 1556730000000, y: 1096175 },
        { x: 1556773200000, y: 12382 },
      ],
      color: '#DB1374',
    },
    {
      key: 'uniqueDestinationIpsHistogram',
      value: [
        { x: 1556686800000, y: 565975 },
        { x: 1556730000000, y: 1084366 },
        { x: 1556773200000, y: 12280 },
      ],
      color: '#490092',
    },
  ];

  describe('render', () => {
    beforeAll(() => {
      wrapper = mount(<AreaChartBaseComponent height={100} width={120} data={mockAreaChartData} />);
    });

    it('should render two area series', () => {
      expect(wrapper.find('EuiAreaSeries')).toHaveLength(2);
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
      wrapper = mount(
        <AreaChartBaseComponent height={null} width={null} data={mockAreaChartData} />
      );
    });

    it('should not render without height and width', () => {
      expect(wrapper.find('SeriesChart')).toHaveLength(0);
    });
  });
});

describe('AreaChartWithCustomPrompt', () => {
  let wrapper: ReactWrapper;
  describe.each([
    [
      [
        {
          key: 'uniqueSourceIpsHistogram',
          value: [
            { x: 1556686800000, y: 580213 },
            { x: 1556730000000, y: 1096175 },
            { x: 1556773200000, y: 12382 },
          ],
          color: '#DB1374',
        },
        {
          key: 'uniqueDestinationIpsHistogram',
          value: [
            { x: 1556686800000, y: 565975 },
            { x: 1556730000000, y: 1084366 },
            { x: 1556773200000, y: 12280 },
          ],
          color: '#490092',
        },
      ],
      [
        [
          {
            key: 'uniqueSourceIpsHistogram',
            value: [],
            color: '#DB1374',
          },
          {
            key: 'uniqueDestinationIpsHistogram',
            value: [
              { x: 1556686800000, y: 565975 },
              { x: 1556730000000, y: 1084366 },
              { x: 1556773200000, y: 12280 },
            ],
            color: '#490092',
          },
        ],
      ],
    ],
  ])('renders areachart', (data: AreaChartData[] | [] | null | undefined) => {
    beforeAll(() => {
      wrapper = mount(<AreaChartWithCustomPrompt height={100} width={120} data={data} />);
    });

    it('render AreaChartBaseComponent', () => {
      expect(wrapper.find('[data-test-subj="stat-area-chart"]').first()).toHaveLength(1);
      expect(wrapper.find('ChartHolder')).toHaveLength(0);
    });
  });

  describe.each([
    null,
    [],
    [
      {
        key: 'uniqueSourceIpsHistogram',
        value: null,
        color: '#DB1374',
      },
      {
        key: 'uniqueDestinationIpsHistogram',
        value: null,
        color: '#490092',
      },
    ],
    [
      {
        key: 'uniqueSourceIpsHistogram',
        value: [{ x: 1556686800000 }, { x: 1556730000000 }, { x: 1556773200000 }],
        color: '#DB1374',
      },
      {
        key: 'uniqueDestinationIpsHistogram',
        value: [{ x: 1556686800000 }, { x: 1556730000000 }, { x: 1556773200000 }],
        color: '#490092',
      },
    ],
    [
      [
        {
          key: 'uniqueSourceIpsHistogram',
          value: [
            { x: 1556686800000, y: 580213 },
            { x: 1556730000000, y: null },
            { x: 1556773200000, y: 12382 },
          ],
          color: '#DB1374',
        },
        {
          key: 'uniqueDestinationIpsHistogram',
          value: [
            { x: 1556686800000, y: 565975 },
            { x: 1556730000000, y: 1084366 },
            { x: 1556773200000, y: 12280 },
          ],
          color: '#490092',
        },
      ],
    ],
    [
      [
        {
          key: 'uniqueSourceIpsHistogram',
          value: [
            { x: 1556686800000, y: 580213 },
            { x: 1556730000000, y: {} },
            { x: 1556773200000, y: 12382 },
          ],
          color: '#DB1374',
        },
        {
          key: 'uniqueDestinationIpsHistogram',
          value: [
            { x: 1556686800000, y: 565975 },
            { x: 1556730000000, y: 1084366 },
            { x: 1556773200000, y: 12280 },
          ],
          color: '#490092',
        },
      ],
    ],
  ])('renders prompt', (data: AreaChartData[] | [] | null | undefined) => {
    beforeAll(() => {
      wrapper = mount(<AreaChartWithCustomPrompt height={100} width={120} data={data} />);
    });

    it('render Chart Holder', () => {
      expect(wrapper.find('[data-test-subj="stat-area-chart"]')).toHaveLength(0);
      expect(wrapper.find('ChartHolder')).toHaveLength(1);
    });
  });
});
