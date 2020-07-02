/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';
// import { act } from 'react-dom/test-utils';
import { EuiThemeProvider } from '../../../../../../../observability/public';
import { EuiToolTip } from '@elastic/eui';
import { ConditionalToolTip } from './conditional_tooltip';
import {
  InfraWaffleMapNode,
  InfraWaffleMapOptions,
  InfraFormatterType,
} from '../../../../../lib/lib';

jest.mock('../../../../../containers/source', () => ({
  useSourceContext: () => ({ sourceId: 'default' }),
}));

jest.mock('../../hooks/use_snaphot');
import { useSnapshot } from '../../hooks/use_snaphot';
const mockedUseSnapshot = useSnapshot as jest.Mock<ReturnType<typeof useSnapshot>>;

const NODE: InfraWaffleMapNode = {
  pathId: 'host-01',
  id: 'host-01',
  name: 'host-01',
  path: [{ value: 'host-01', label: 'host-01' }],
  metrics: [{ name: 'cpu' }],
};

const OPTIONS: InfraWaffleMapOptions = {
  formatter: InfraFormatterType.percent,
  formatTemplate: '{value}',
  metric: { type: 'cpu' },
  groupBy: [],
  legend: {
    type: 'steppedGradient',
    rules: [],
  },
  sort: { by: 'value', direction: 'desc' },
};

export const nextTick = () => new Promise((res) => process.nextTick(res));
const ChildComponent = () => <div>child</div>;

describe('ConditionalToolTip', () => {
  afterEach(() => {
    mockedUseSnapshot.mockReset();
  });

  function createWrapper(currentTime: number = Date.now(), hidden: boolean = false) {
    return mount(
      <EuiThemeProvider darkMode={false}>
        <ConditionalToolTip
          currentTime={currentTime}
          hidden={hidden}
          node={NODE}
          options={OPTIONS}
          formatter={(v: number) => `${v}`}
          nodeType="host"
        >
          <ChildComponent />
        </ConditionalToolTip>
      </EuiThemeProvider>
    );
  }

  it('should return children when hidden', () => {
    mockedUseSnapshot.mockReturnValue({
      nodes: [],
      error: null,
      loading: true,
      interval: '',
      reload: jest.fn(() => Promise.resolve()),
    });
    const currentTime = Date.now();
    const wrapper = createWrapper(currentTime, true);
    expect(wrapper.find(ChildComponent).exists()).toBeTruthy();
  });

  it('should just work', () => {
    jest.useFakeTimers();
    const reloadMock = jest.fn(() => Promise.resolve());
    mockedUseSnapshot.mockReturnValue({
      nodes: [
        {
          path: [{ label: 'host-01', value: 'host-01', ip: '192.168.1.10' }],
          metrics: [
            { name: 'cpu', value: 0.1, avg: 0.4, max: 0.7 },
            { name: 'memory', value: 0.8, avg: 0.8, max: 1 },
            { name: 'tx', value: 1000000, avg: 1000000, max: 1000000 },
            { name: 'rx', value: 1000000, avg: 1000000, max: 1000000 },
          ],
        },
      ],
      error: null,
      loading: false,
      interval: '60s',
      reload: reloadMock,
    });
    const currentTime = Date.now();
    const wrapper = createWrapper(currentTime, false);
    expect(wrapper.find(ChildComponent).exists()).toBeTruthy();
    expect(wrapper.find(EuiToolTip).exists()).toBeTruthy();
    const expectedQuery = JSON.stringify({
      bool: {
        filter: {
          match_phrase: { 'host.name': 'host-01' },
        },
      },
    });
    const expectedMetrics = [{ type: 'cpu' }, { type: 'memory' }, { type: 'tx' }, { type: 'rx' }];
    expect(mockedUseSnapshot).toBeCalledWith(
      expectedQuery,
      expectedMetrics,
      [],
      'host',
      'default',
      currentTime,
      '',
      '',
      false
    );
    wrapper.find('[data-test-subj~="conditionalTooltipMouseHandler"]').simulate('mouseOver');
    wrapper.find(EuiToolTip).simulate('mouseOver');
    jest.advanceTimersByTime(500);
    expect(reloadMock).toHaveBeenCalled();
    expect(wrapper.find(EuiToolTip).props().content).toMatchSnapshot();
  });

  it('should not load data if mouse out before 200 ms', () => {
    jest.useFakeTimers();
    const reloadMock = jest.fn(() => Promise.resolve());
    mockedUseSnapshot.mockReturnValue({
      nodes: [],
      error: null,
      loading: true,
      interval: '',
      reload: reloadMock,
    });
    const currentTime = Date.now();
    const wrapper = createWrapper(currentTime, false);
    expect(wrapper.find(ChildComponent).exists()).toBeTruthy();
    expect(wrapper.find(EuiToolTip).exists()).toBeTruthy();
    wrapper.find('[data-test-subj~="conditionalTooltipMouseHandler"]').simulate('mouseOver');
    jest.advanceTimersByTime(100);
    wrapper.find('[data-test-subj~="conditionalTooltipMouseHandler"]').simulate('mouseOut');
    jest.advanceTimersByTime(200);
    expect(reloadMock).not.toHaveBeenCalled();
  });
});
