/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../__mocks__/enterprise_search_url.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiCard } from '@elastic/eui';

import { EuiCardTo } from '../../../shared/react_router_helpers';

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

    expect(wrapper.find(EuiCardTo).prop('to')).toBe('/foo');
  });
});
