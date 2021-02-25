/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../../__mocks__/kea.mock';
import '../../../__mocks__/engine_logic.mock';

import React from 'react';

import { mount, ReactWrapper } from 'enzyme';

import { EuiButtonEmptyTo } from '../../../../shared/react_router_helpers';
import { AnalyticsChart } from '../../analytics';

import { TotalCharts } from './total_charts';

describe('TotalCharts', () => {
  let wrapper: ReactWrapper<any, Readonly<{}>, React.Component<{}, {}, any>>;
  beforeAll(() => {
    jest.clearAllMocks();
    setMockValues({
      startDate: '1970-01-01',
      queriesPerDay: [0, 1, 2, 3, 5, 10, 50],
      operationsPerDay: [0, 0, 0, 0, 0, 0, 0],
    });
    wrapper = mount(<TotalCharts />);
  });

  it('renders the total queries chart', () => {
    const chart = wrapper.find('[data-test-subj="TotalQueriesChart"]');

    expect(chart.find('h4').text()).toEqual('Total queries');
    expect(chart.find(EuiButtonEmptyTo).prop('to')).toEqual('/engines/some-engine/analytics');
    expect(chart.find(AnalyticsChart)).toHaveLength(1);
  });

  it('renders the total API operations chart', () => {
    const chart = wrapper.find('[data-test-subj="TotalApiOperationsChart"]');

    expect(chart.find('h4').text()).toEqual('Total API operations');
    expect(chart.find(EuiButtonEmptyTo).prop('to')).toEqual('/engines/some-engine/api-logs');
    expect(chart.find(AnalyticsChart)).toHaveLength(1);
  });
});
