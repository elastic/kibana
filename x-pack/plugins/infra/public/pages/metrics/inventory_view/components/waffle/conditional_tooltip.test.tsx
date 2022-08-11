/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import toJson from 'enzyme-to-json';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { ConditionalToolTip } from './conditional_tooltip';
import { InfraWaffleMapNode } from '../../../../../lib/lib';

jest.mock('../../../../../containers/metrics_source', () => ({
  useSourceContext: () => ({ sourceId: 'default' }),
}));

jest.mock('../../hooks/use_snaphot');
import { useSnapshot } from '../../hooks/use_snaphot';
jest.mock('../../hooks/use_waffle_options');
import { useWaffleOptionsContext } from '../../hooks/use_waffle_options';
const mockedUseSnapshot = useSnapshot as jest.Mock<ReturnType<typeof useSnapshot>>;
const mockedUseWaffleOptionsContext = useWaffleOptionsContext as jest.Mock<
  ReturnType<typeof useWaffleOptionsContext>
>;

const NODE: InfraWaffleMapNode = {
  pathId: 'host-01',
  id: 'host-01',
  name: 'host-01',
  path: [{ value: 'host-01', label: 'host-01' }],
  metrics: [{ name: 'cpu' }],
};

export const nextTick = () => new Promise((res) => process.nextTick(res));

describe('ConditionalToolTip', () => {
  const currentTime = Date.now();

  it('renders correctly', () => {
    mockedUseSnapshot.mockReturnValue({
      nodes: [
        {
          name: 'host-01',
          path: [{ label: 'host-01', value: 'host-01', ip: '192.168.1.10' }],
          metrics: [
            { name: 'cpu', value: 0.1, avg: 0.4, max: 0.7 },
            { name: 'memory', value: 0.8, avg: 0.8, max: 1 },
            { name: 'tx', value: 1000000, avg: 1000000, max: 1000000 },
            { name: 'rx', value: 1000000, avg: 1000000, max: 1000000 },
            {
              name: 'cedd6ca0-5775-11eb-a86f-adb714b6c486',
              max: 0.34164999922116596,
              value: 0.34140000740687054,
              avg: 0.20920833365784752,
            },
            {
              name: 'e12dd700-5775-11eb-a86f-adb714b6c486',
              max: 4703.166666666667,
              value: 4392.166666666667,
              avg: 3704.6666666666674,
            },
          ],
        },
      ],
      error: null,
      loading: false,
      interval: '60s',
      reload: jest.fn(() => Promise.resolve()),
    });
    mockedUseWaffleOptionsContext.mockReturnValue(mockedUseWaffleOptionsContexReturnValue);
    const expectedQuery = JSON.stringify({
      bool: {
        filter: {
          match_phrase: { 'host.name': 'host-01' },
        },
      },
    });
    const expectedMetrics = [
      { type: 'cpu' },
      { type: 'memory' },
      { type: 'tx' },
      { type: 'rx' },
      {
        aggregation: 'avg',
        field: 'host.cpu.pct',
        id: 'cedd6ca0-5775-11eb-a86f-adb714b6c486',
        label: 'My Custom Label',
        type: 'custom',
      },
      {
        aggregation: 'avg',
        field: 'host.network.out.packets',
        id: 'e12dd700-5775-11eb-a86f-adb714b6c486',
        type: 'custom',
      },
    ];
    const wrapper = mount(
      <EuiThemeProvider darkMode={false}>
        <ConditionalToolTip currentTime={currentTime} node={NODE} nodeType="host" />
      </EuiThemeProvider>
    );
    const tooltip = wrapper.find('[data-test-subj~="conditionalTooltipContent-host-01"]');
    expect(toJson(tooltip)).toMatchSnapshot();

    expect(mockedUseSnapshot).toBeCalledWith(
      expectedQuery,
      expectedMetrics,
      [],
      'host',
      'default',
      currentTime,
      '',
      ''
    );
  });
});

const mockedUseWaffleOptionsContexReturnValue: ReturnType<typeof useWaffleOptionsContext> = {
  changeMetric: jest.fn(() => {}),
  changeGroupBy: jest.fn(() => {}),
  changeNodeType: jest.fn(() => {}),
  changeView: jest.fn(() => {}),
  changeCustomOptions: jest.fn(() => {}),
  changeAutoBounds: jest.fn(() => {}),
  changeBoundsOverride: jest.fn(() => {}),
  changeAccount: jest.fn(() => {}),
  changeRegion: jest.fn(() => {}),
  changeCustomMetrics: jest.fn(() => {}),
  changeLegend: jest.fn(() => {}),
  changeSort: jest.fn(() => {}),
  changeTimelineOpen: jest.fn(() => {}),
  setWaffleOptionsState: jest.fn(() => {}),
  boundsOverride: { max: 1, min: 0 },
  autoBounds: true,
  accountId: '',
  region: '',
  sort: { by: 'name', direction: 'desc' },
  groupBy: [],
  nodeType: 'host',
  customOptions: [],
  view: 'map',
  metric: { type: 'cpu' },
  customMetrics: [
    {
      aggregation: 'avg',
      field: 'host.cpu.pct',
      id: 'cedd6ca0-5775-11eb-a86f-adb714b6c486',
      label: 'My Custom Label',
      type: 'custom',
    },
    {
      aggregation: 'avg',
      field: 'host.network.out.packets',
      id: 'e12dd700-5775-11eb-a86f-adb714b6c486',
      type: 'custom',
    },
  ],
};
