/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../../__mocks__/shallow_usecontext.mock';

import React from 'react';
import { shallow } from 'enzyme';
import { EuiFlexGrid } from '@elastic/eui';

import { OrganizationStats } from './organization_stats';
import { StatisticCard } from './statistic_card';
import { defaultServerData } from './overview';

describe('OrganizationStats', () => {
  it('renders', () => {
    const wrapper = shallow(<OrganizationStats {...defaultServerData} />);

    expect(wrapper.find(StatisticCard)).toHaveLength(2);
    expect(wrapper.find(EuiFlexGrid).prop('columns')).toEqual(2);
  });

  it('renders additional cards for federated auth', () => {
    const wrapper = shallow(<OrganizationStats {...defaultServerData} isFederatedAuth={false} />);

    expect(wrapper.find(StatisticCard)).toHaveLength(4);
    expect(wrapper.find(EuiFlexGrid).prop('columns')).toEqual(4);
  });
});
