/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { Paging, ResultsPerPage } from '@elastic/react-search-ui';

import { Pagination } from './pagination';

describe('Pagination', () => {
  it('renders', () => {
    const wrapper = shallow(<Pagination aria-label="foo" />);
    expect(wrapper.find(Paging).exists()).toBe(true);
    expect(wrapper.find(ResultsPerPage).exists()).toBe(true);
  });

  it('passes aria-label through to Paging', () => {
    const wrapper = shallow(<Pagination aria-label="foo" />);
    expect(wrapper.find(Paging).prop('aria-label')).toEqual('foo');
  });
});
