/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { EuiLinkTo } from '../react_router_helpers';

import { AddContentEmptyPrompt } from '.';

describe('AddContentEmptyPrompt', () => {
  let wrapper: ShallowWrapper;

  beforeAll(() => {
    wrapper = shallow(<AddContentEmptyPrompt />);
  });

  it('renders', () => {
    expect(wrapper.find('h2').text()).toEqual('Add content to Enterprise Search');
    expect(wrapper.find(EuiLinkTo).prop('to')).toEqual(
      '/app/enterprise_search/content/search_indices'
    );
  });
});
