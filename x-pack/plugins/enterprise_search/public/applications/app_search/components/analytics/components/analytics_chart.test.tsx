/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockKibanaValues } from '../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { Chart, Settings, LineSeries, Axis } from '@elastic/charts';

import { AnalyticsChart } from '.';

describe('AnalyticsChart', () => {
  const MOCK_DATA = [
    { x: '1970-01-01', y: 0 },
    { x: '1970-01-02', y: 1 },
    { x: '1970-01-03', y: 5 },
    { x: '1970-01-04', y: 50 },
    { x: '1970-01-05', y: 25 },
  ];

  beforeAll(() => {
    jest.clearAllMocks();
  });

  it('renders an Elastic line chart', () => {
    const wrapper = shallow(
      <AnalyticsChart height={300} lines={[{ id: 'test', data: MOCK_DATA }]} />
    );

    expect(wrapper.find(Chart).prop('size')).toEqual({ height: 300 });
    expect(wrapper.find(Axis)).toHaveLength(2);
    expect(mockKibanaValues.charts.theme.useChartsTheme).toHaveBeenCalled();
    expect(mockKibanaValues.charts.theme.useChartsBaseTheme).toHaveBeenCalled();

    expect(wrapper.find(LineSeries)).toHaveLength(1);
    expect(wrapper.find(LineSeries).prop('id')).toEqual('test');
    expect(wrapper.find(LineSeries).prop('data')).toEqual(MOCK_DATA);
  });

  it('renders multiple lines', () => {
    const wrapper = shallow(
      <AnalyticsChart
        lines={[
          { id: 'line 1', data: MOCK_DATA },
          { id: 'line 2', data: MOCK_DATA },
          { id: 'line 3', data: MOCK_DATA },
        ]}
      />
    );

    expect(wrapper.find(LineSeries)).toHaveLength(3);
  });

  it('renders dashed lines', () => {
    const wrapper = shallow(
      <AnalyticsChart lines={[{ id: 'dashed 1', data: MOCK_DATA, isDashed: true }]} />
    );

    expect(wrapper.find(LineSeries).prop('lineSeriesStyle')?.line?.dash).toBeTruthy();
  });

  it('formats x-axis dates correctly', () => {
    const wrapper = shallow(<AnalyticsChart lines={[{ id: 'test', data: MOCK_DATA }]} />);
    const dateFormatter: Function = wrapper.find('#bottom-axis').prop('tickFormat');

    expect(dateFormatter('1970-02-28')).toEqual('2/28');
  });

  it('formats tooltip dates correctly', () => {
    const wrapper = shallow(<AnalyticsChart lines={[{ id: 'test', data: MOCK_DATA }]} />);
    const dateFormatter: Function = (wrapper.find(Settings).prop('tooltip') as any).headerFormatter;

    expect(dateFormatter({ value: '1970-12-03' })).toEqual('December 3, 1970');
  });
});
