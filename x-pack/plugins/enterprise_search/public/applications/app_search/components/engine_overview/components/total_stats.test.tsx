/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { AnalyticsCards } from '../../analytics';

import { TotalStats } from './total_stats';

describe('TotalStats', () => {
  it('renders', () => {
    setMockValues({
      totalQueries: 11,
      documentCount: 22,
      totalClicks: 33,
    });
    const wrapper = shallow(<TotalStats />);
    expect(wrapper.find(AnalyticsCards)).toHaveLength(1);
  });
});
