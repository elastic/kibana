/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { setMockValues } from '../../../__mocks__/kea.mock';

import React from 'react';
import { shallow } from 'enzyme';

import { UnavailablePrompt, TotalStats, TotalCharts, RecentApiLogs } from './components';
import { EngineOverviewMetrics } from './engine_overview_metrics';

describe('EngineOverviewMetrics', () => {
  it('renders', () => {
    const wrapper = shallow(<EngineOverviewMetrics />);
    expect(wrapper.find('h1').text()).toEqual('Engine overview');
  });

  it('renders an unavailable prompt if engine data is still indexing', () => {
    setMockValues({ apiLogsUnavailable: true });
    const wrapper = shallow(<EngineOverviewMetrics />);
    expect(wrapper.find(UnavailablePrompt)).toHaveLength(1);
  });

  it('renders total stats, charts, and recent logs when metrics are available', () => {
    setMockValues({ apiLogsUnavailable: false });
    const wrapper = shallow(<EngineOverviewMetrics />);
    expect(wrapper.find(TotalStats)).toHaveLength(1);
    expect(wrapper.find(TotalCharts)).toHaveLength(1);
    expect(wrapper.find(RecentApiLogs)).toHaveLength(1);
  });
});
