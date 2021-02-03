/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { setMockValues } from '../../../../__mocks__';

import React from 'react';
import { shallow } from 'enzyme';

import { AnalyticsTable } from '../components';
import { TopQueries } from './';

describe('TopQueries', () => {
  it('renders', () => {
    setMockValues({ topQueries: [] });
    const wrapper = shallow(<TopQueries />);

    expect(wrapper.find(AnalyticsTable)).toHaveLength(1);
  });
});
