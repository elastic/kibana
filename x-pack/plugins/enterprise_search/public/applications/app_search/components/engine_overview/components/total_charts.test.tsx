/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { setMockValues } from '../../../../__mocks__/kea.mock';

import React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';

import { EuiButtonTo } from '../../../../shared/react_router_helpers';

import { TotalCharts } from './total_charts';

describe('TotalCharts', () => {
  let wrapper: ShallowWrapper;

  beforeAll(() => {
    jest.clearAllMocks();
    setMockValues({
      engineName: 'some-engine',
      startDate: '1970-01-01',
      endDate: '1970-01-08',
      queriesPerDay: [0, 1, 2, 3, 5, 10, 50],
      operationsPerDay: [0, 0, 0, 0, 0, 0, 0],
    });
    wrapper = shallow(<TotalCharts />);
  });

  it('renders the total queries chart', () => {
    const chart = wrapper.find('[data-test-subj="TotalQueriesChart"]');

    expect(chart.find('h2').text()).toEqual('Total queries');
    expect(chart.find(EuiButtonTo).prop('to')).toEqual('/engines/some-engine/analytics');
    // TODO: find chart component
  });

  it('renders the total API operations chart', () => {
    const chart = wrapper.find('[data-test-subj="TotalApiOperationsChart"]');

    expect(chart.find('h2').text()).toEqual('Total API operations');
    expect(chart.find(EuiButtonTo).prop('to')).toEqual('/engines/some-engine/api-logs');
    // TODO: find chart component
  });
});
