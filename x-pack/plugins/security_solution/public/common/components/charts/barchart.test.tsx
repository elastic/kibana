/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AxisStyle } from '@elastic/charts';
import { Chart, BarSeries, Axis, ScaleType } from '@elastic/charts';
import type { ReactWrapper, ShallowWrapper } from 'enzyme';
import { mount, shallow } from 'enzyme';
import React from 'react';

import { escapeDataProviderId } from '../drag_and_drop/helpers';
import { TestProviders } from '../../mock';
import '../../mock/match_media';
import '../../mock/react_beautiful_dnd';

import { BarChartBaseComponent, BarChartComponent } from './barchart';
import type { ChartSeriesData } from './common';

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    EuiScreenReaderOnly: () => <></>,
  };
});

jest.mock('../../lib/kibana');

jest.mock('uuid', () => {
  return {
    v1: jest.fn(() => 'uuid.v1()'),
    v4: jest.fn(() => 'uuidv4()'),
  };
});

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
    const mockXAxisStyle = {
      tickLine: {
        size: 0,
      },
      tickLabel: {
        padding: 16,
        fontSize: 10.5,
      },
    } as Partial<AxisStyle>;
    const mockYAxisStyle = {
      tickLine: {
        size: 0,
      },
      tickLabel: {
        padding: 16,
        fontSize: 14,
      },
    } as Partial<AxisStyle>;
    const configs = {
      series: {
        xScaleType: ScaleType.Ordinal,
        yScaleType: ScaleType.Linear,
        barSeriesStyle: {
          rect: {
            widthPixel: 22,
            opacity: 1,
          },
        },
      },
      axis: {
        yTickFormatter: mockNumberFormatter,
        bottom: {
          style: mockXAxisStyle,
        },
        left: {
          style: mockYAxisStyle,
        },
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

    it('should render BarSeries with given barSeriesStyle', () => {
      expect(shallowWrapper.find(BarSeries).first().prop('barSeriesStyle')).toEqual(
        configs.series.barSeriesStyle
      );
    });

    it('should render xAxis with given tick formatter', () => {
      expect(shallowWrapper.find(Axis).first().prop('tickFormat')).toBeUndefined();
    });

    it('should render xAxis style', () => {
      expect(shallowWrapper.find(Axis).first().prop('style')).toEqual(mockXAxisStyle);
    });

    it('should render yAxis with given tick formatter', () => {
      expect(shallowWrapper.find(Axis).last().prop('style')).toEqual(mockYAxisStyle);
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
      <TestProviders>
        <BarChartComponent configs={mockConfig} barChart={data} stackByField={stackByField} />
      </TestProviders>
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
      expect(wrapper.find(`div[data-provider-id="${dataProviderId}"]`).first().text()).toEqual(
        datum.key
      );
    });
  });
});

describe.each(chartDataSets)('BarChart with custom color', () => {
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
      color: '#1EA591',
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
      color: '#000000',
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
      color: '#ffffff',
    },
  ];

  const expectedColors = ['#1EA591', '#000000', '#ffffff'];

  const stackByField = 'process.name';

  beforeAll(() => {
    wrapper = mount(
      <TestProviders>
        <BarChartComponent configs={mockConfig} barChart={data} stackByField={stackByField} />
      </TestProviders>
    );
  });

  expectedColors.forEach((color, i) => {
    test(`it renders the expected legend color ${color} for legend item ${i}`, () => {
      expect(wrapper.find(`div [color="${color}"]`).exists()).toBe(true);
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
