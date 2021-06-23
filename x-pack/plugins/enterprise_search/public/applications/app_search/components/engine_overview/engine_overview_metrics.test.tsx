/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../__mocks__/engine_logic.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { getPageTitle } from '../../../test_helpers';

import { TotalStats, TotalCharts, RecentApiLogs } from './components';
import { EngineOverviewMetrics } from './engine_overview_metrics';

describe('EngineOverviewMetrics', () => {
  it('renders', () => {
    const wrapper = shallow(<EngineOverviewMetrics />);

    expect(getPageTitle(wrapper)).toEqual('Engine overview');
    expect(wrapper.find(TotalStats)).toHaveLength(1);
    expect(wrapper.find(TotalCharts)).toHaveLength(1);
    expect(wrapper.find(RecentApiLogs)).toHaveLength(1);
  });
});
