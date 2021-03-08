/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './__mocks__/overview_logic.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiFlexGrid } from '@elastic/eui';

import { setMockValues } from './__mocks__';
import { OrganizationStats } from './organization_stats';
import { StatisticCard } from './statistic_card';

describe('OrganizationStats', () => {
  it('renders', () => {
    const wrapper = shallow(<OrganizationStats />);

    expect(wrapper.find(StatisticCard)).toHaveLength(2);
    expect(wrapper.find(EuiFlexGrid).prop('columns')).toEqual(2);
  });

  it('renders additional cards for federated auth', () => {
    setMockValues({ isFederatedAuth: false });
    const wrapper = shallow(<OrganizationStats />);

    expect(wrapper.find(StatisticCard)).toHaveLength(4);
    expect(wrapper.find(EuiFlexGrid).prop('columns')).toEqual(4);
  });
});
