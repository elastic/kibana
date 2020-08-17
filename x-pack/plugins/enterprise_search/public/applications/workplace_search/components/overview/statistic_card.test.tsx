/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../../__mocks__/shallow_usecontext.mock';

import React from 'react';
import { shallow } from 'enzyme';

import { EuiCard } from '@elastic/eui';

import { StatisticCard } from './statistic_card';

const props = {
  title: 'foo',
};

describe('StatisticCard', () => {
  it('renders', () => {
    const wrapper = shallow(<StatisticCard {...props} />);

    expect(wrapper.find(EuiCard)).toHaveLength(1);
  });

  it('renders clickable card', () => {
    const wrapper = shallow(<StatisticCard {...props} actionPath="/foo" />);

    expect(wrapper.find(EuiCard).prop('href')).toBe('http://localhost:3002/ws/foo');
  });
});
