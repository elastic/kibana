/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { setMockValues } from '../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiBadge } from '@elastic/eui';

import { QueryPerformance } from './query_performance';

describe('QueryPerformance', () => {
  const values = {
    queryPerformanceScore: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
  });

  it('renders as green with the text "optimal" for a performance score of less than 6', () => {
    const wrapper = shallow(<QueryPerformance />);
    expect(wrapper.find(EuiBadge).prop('color')).toEqual('#59deb4');
    expect(wrapper.find(EuiBadge).children().text()).toEqual('Query performance: optimal');
  });

  it('renders as blue with the text "good" for a performance score of less than 11', () => {
    setMockValues({
      queryPerformanceScore: 10,
    });
    const wrapper = shallow(<QueryPerformance />);
    expect(wrapper.find(EuiBadge).prop('color')).toEqual('#40bfff');
    expect(wrapper.find(EuiBadge).children().text()).toEqual('Query performance: good');
  });

  it('renders as yellow with the text "standard" for a performance score of less than 21', () => {
    setMockValues({
      queryPerformanceScore: 20,
    });
    const wrapper = shallow(<QueryPerformance />);
    expect(wrapper.find(EuiBadge).prop('color')).toEqual('#fed566');
    expect(wrapper.find(EuiBadge).children().text()).toEqual('Query performance: standard');
  });

  it('renders as red with the text "delayed" for a performance score of 21 or more', () => {
    setMockValues({
      queryPerformanceScore: 100,
    });
    const wrapper = shallow(<QueryPerformance />);
    expect(wrapper.find(EuiBadge).prop('color')).toEqual('#ff9173');
    expect(wrapper.find(EuiBadge).children().text()).toEqual('Query performance: delayed');
  });
});
