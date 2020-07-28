/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Chart, BarSeries, Axis, ScaleType } from '@elastic/charts';
import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import { mount, ReactWrapper, shallow, ShallowWrapper } from 'enzyme';
import React from 'react';
import { ThemeProvider } from 'styled-components';

import { escapeDataProviderId } from '../drag_and_drop/helpers';
import { TestProviders } from '../../mock';
import '../../mock/match_media';

import { BarChartBaseComponent, BarChartComponent } from './barchart';
import { ChartSeriesData } from './common';

jest.mock('../../lib/kibana');

jest.mock('uuid', () => {
  return {
    v1: jest.fn(() => 'uuid.v1()'),
    v4: jest.fn(() => 'uuid.v4()'),
  };
});

const theme = () => ({ eui: euiDarkVars, darkMode: true });

const customHeight = '100px';
const customWidth = '120px';
const chartDataSets = [
  [
    [
      { key: 'uniqueSourceIps', value: [{ y: 1714, x: 'uniqueSourceIps' }], color: '#D36086' },
      {
        key: 'uniqueDestinationIps',
        value: [{ y: 2354, x: 'uniqueDestinationIps' }],
        color: '#9170B8',
      },
    ],
  ],
  [
    [
      { key: 'uniqueSourceIps', value: [{ y: 1714, x: '' }], color: '#D36086' },
      {
        key: 'uniqueDestinationIps',
        value: [{ y: 2354, x: '' }],
        color: '#9170B8',
      },
    ],
  ],
  [
    [
      { key: 'uniqueSourceIps', value: [{ y: 1714, x: 'uniqueSourceIps' }], color: '#D36086' },
      {
        key: 'uniqueDestinationIps',
        value: [{ y: 0, x: 'uniqueDestinationIps' }],
        color: '#9170B8',
      },
    ],
  ],
  [
    [
      { key: 'uniqueSourceIps', value: [{ y: null, x: 'uniqueSourceIps' }], color: '#D36086' },
      {
        key: 'uniqueDestinationIps',
        value: [{ y: 2354, x: 'uniqueDestinationIps' }],
        color: '#9170B8',
      },
    ],
  ],
];

const chartHolderDataSets: Array<[ChartSeriesData[] | undefined | null]> = [
  [[]],
  [null],
  [
    [
      { key: 'uniqueSourceIps', color: '#D36086' },
      {
        key: 'uniqueDestinationIps',
        color: '#9170B8',
      },
    ],
  ],
  [
    [
      { key: 'uniqueSourceIps', value: [], color: '#D36086' },
      {
        key: 'uniqueDestinationIps',
        value: [],
        color: '#9170B8',
      },
    ],
  ],
  [
    [
      { key: 'uniqueSourceIps', value: [{}], color: '#D36086' },
      {
        key: 'uniqueDestinationIps',
        value: [{}],
        color: '#9170B8',
      },
    ],
  ],
  [
    [
      { key: 'uniqueSourceIps', value: [{ y: 0, x: 'uniqueSourceIps' }], color: '#D36086' },
      {
        key: 'uniqueDestinationIps',
        value: [{ y: 0, x: 'uniqueDestinationIps' }],
        color: '#9170B8',
      },
    ],
  ],
] as any; // eslint-disable-line @typescript-eslint/no-explicit-any

const mockConfig = {
  series: {
    xScaleType: ScaleType.Time,
    yScaleType: ScaleType.Linear,
    stackAccessors: ['g'],
  },
  axis: {
    xTickFormatter: jest.fn(),
    yTickFormatter: jest.fn(),
    tickSize: 8,
  },
  customHeight: 324,
};

// Suppress warnings about "react-beautiful-dnd"
/* eslint-disable no-console */
const originalError = console.error;
const originalWarn = console.warn;
beforeAll(() => {
  console.warn = jest.fn();
  console.error = jest.fn();
});
afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

describe('BarChartBaseComponent', () => {
  let shallowWrapper: ShallowWrapper;
  const mockBarChartData: ChartSeriesData[] = [
    {
      key: 'uniqueSourceIps',
      value: [{ y: 1714, x: 'uniqueSourceIps', g: 'uniqueSourceIps' }],
      color: '#D36086',
    },
    {
      key: 'uniqueDestinationIps',
      value: [{ y: 2354, x: 'uniqueDestinationIps', g: 'uniqueDestinationIps' }],
      color: '#9170B8',
    },
  ];

  describe('render', () => {
    beforeAll(() => {
      shallowWrapper = shallow(
        <BarChartBaseComponent height={customHeight} width={customWidth} data={mockBarChartData} />
      );
    });

    it('should render two bar series', () => {
      expect(shallowWrapper.find(Chart)).toHaveLength(1);
    });
  });

  describe('render with customized configs', () => {
    const mockNumberFormatter = jest.fn();
    const configs = {
      series: {
        xScaleType: ScaleType.Ordinal,
        yScaleType: ScaleType.Linear,
      },
      axis: {
        yTickFormatter: mockNumberFormatter,
      },
    };

    beforeAll(() => {
      shallowWrapper = shallow(
        <BarChartBaseComponent
          height={customHeight}
          width={customWidth}
          data={mockBarChartData}
          configs={configs}
        />
      );
    });

    it(`should ${mockBarChartData.length} render BarSeries`, () => {
      expect(shallowWrapper.find(BarSeries)).toHaveLength(mockBarChartData.length);
    });

    it('should render BarSeries with given xScaleType', () => {
      expect(shallowWrapper.find(BarSeries).first().prop('xScaleType')).toEqual(
        configs.series.xScaleType
      );
    });

    it('should render BarSeries with given yScaleType', () => {
      expect(shallowWrapper.find(BarSeries).first().prop('yScaleType')).toEqual(
        configs.series.yScaleType
      );
    });

    it('should render xAxis with given tick formatter', () => {
      expect(shallowWrapper.find(Axis).first().prop('tickFormat')).toBeUndefined();
    });

    it('should render yAxis with given tick formatter', () => {
      expect(shallowWrapper.find(Axis).last().prop('tickFormat')).toEqual(mockNumberFormatter);
    });
  });

  describe('render with default configs if no customized configs given', () => {
    beforeAll(() => {
      shallowWrapper = shallow(
        <BarChartBaseComponent height={customHeight} width={customWidth} data={mockBarChartData} />
      );
    });

    it(`should ${mockBarChartData.length} render BarSeries`, () => {
      expect(shallow).toMatchSnapshot();
      expect(shallowWrapper.find(BarSeries)).toHaveLength(mockBarChartData.length);
    });

    it('should render BarSeries with default xScaleType: Linear', () => {
      expect(shallowWrapper.find(BarSeries).first().prop('xScaleType')).toEqual(ScaleType.Linear);
    });

    it('should render BarSeries with default yScaleType: Linear', () => {
      expect(shallowWrapper.find(BarSeries).first().prop('yScaleType')).toEqual(ScaleType.Linear);
    });

    it('should not format xTicks value', () => {
      expect(shallowWrapper.find(Axis).last().prop('tickFormat')).toBeUndefined();
    });

    it('should not format yTicks value', () => {
      expect(shallowWrapper.find(Axis).last().prop('tickFormat')).toBeUndefined();
    });
  });

  describe('no render', () => {
    beforeAll(() => {
      shallowWrapper = shallow(
        <BarChartBaseComponent height={null} width={null} data={mockBarChartData} />
      );
    });

    it('should not render without height and width', () => {
      expect(shallowWrapper.find(Chart)).toHaveLength(0);
    });
  });
});

describe.each(chartDataSets)('BarChart with valid data [%o]', (data) => {
  let shallowWrapper: ShallowWrapper;

  beforeAll(() => {
    shallowWrapper = shallow(<BarChartComponent configs={mockConfig} barChart={data} />);
  });

  it(`should render chart`, () => {
    expect(shallowWrapper.find('BarChartBase')).toHaveLength(1);
    expect(shallowWrapper.find('ChartPlaceHolder')).toHaveLength(0);
  });

  it('it does NOT render a draggable legend because stackByField is not provided', () => {
    expect(shallowWrapper.find('[data-test-subj="draggable-legend"]').exists()).toBe(false);
  });
});

describe.each(chartDataSets)('BarChart with stackByField', () => {
  let wrapper: ReactWrapper;

  const data = [
    {
      key: 'python.exe',
      value: [
        {
          x: 1586754900000,
          y: 9675,
          g: 'python.exe',
        },
      ],
    },
    {
      key: 'kernel',
      value: [
        {
          x: 1586754900000,
          y: 8708,
          g: 'kernel',
        },
        {
          x: 1586757600000,
          y: 9282,
          g: 'kernel',
        },
      ],
    },
    {
      key: 'sshd',
      value: [
        {
          x: 1586754900000,
          y: 5907,
          g: 'sshd',
        },
      ],
    },
  ];

  const expectedColors = ['#1EA593', '#2B70F7', '#CE0060'];

  const stackByField = 'process.name';

  beforeAll(() => {
    wrapper = mount(
      <ThemeProvider theme={theme}>
        <TestProviders>
          <BarChartComponent configs={mockConfig} barChart={data} stackByField={stackByField} />
        </TestProviders>
      </ThemeProvider>
    );
  });

  it('it renders a draggable legend', () => {
    expect(wrapper.find('[data-test-subj="draggable-legend"]').exists()).toBe(true);
  });

  expectedColors.forEach((color, i) => {
    test(`it renders the expected legend color ${color} for legend item ${i}`, () => {
      expect(wrapper.find(`div [color="${color}"]`).exists()).toBe(true);
    });
  });

  data.forEach((datum) => {
    test(`it renders the expected draggable legend text for datum ${datum.key}`, () => {
      const dataProviderId = `draggableId.content.draggable-legend-item-uuid_v4()-${escapeDataProviderId(
        stackByField
      )}-${escapeDataProviderId(datum.key)}`;

      expect(
        wrapper.find(`div [data-rbd-draggable-id="${dataProviderId}"]`).first().text()
      ).toEqual(datum.key);
    });
  });
});

describe.each(chartHolderDataSets)('BarChart with invalid data [%o]', (data) => {
  let shallowWrapper: ShallowWrapper;

  beforeAll(() => {
    shallowWrapper = shallow(<BarChartComponent configs={mockConfig} barChart={data} />);
  });

  it(`should render a ChartPlaceHolder`, () => {
    expect(shallowWrapper.find('BarChartBase')).toHaveLength(0);
    expect(shallowWrapper.find('ChartPlaceHolder')).toHaveLength(1);
  });
});
