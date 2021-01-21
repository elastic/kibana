/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { setMockValues } from '../../../../__mocks__';

import React from 'react';
import { shallow } from 'enzyme';

import { AnalyticsCards } from '../components';
import { Analytics } from './';

describe('Analytics overview', () => {
  it('renders', () => {
    setMockValues({
      totalQueries: 3,
      totalQueriesNoResults: 2,
      totalClicks: 1,
    });
    const wrapper = shallow(<Analytics />);

    expect(wrapper.find(AnalyticsCards)).toHaveLength(1);
  });
});
