/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { setMockValues } from '../../../../__mocks__';

import React from 'react';
import { shallow } from 'enzyme';

import { AnalyticsTable } from '../components';
import { TopQueriesNoClicks } from './';

describe('TopQueriesNoClicks', () => {
  it('renders', () => {
    setMockValues({ topQueriesNoClicks: [] });
    const wrapper = shallow(<TopQueriesNoClicks />);

    expect(wrapper.find(AnalyticsTable)).toHaveLength(1);
  });
});
