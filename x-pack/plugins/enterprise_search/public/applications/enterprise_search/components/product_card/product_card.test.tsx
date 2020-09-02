/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { EuiPanel } from '@elastic/eui';
import { EuiButton } from '../../../shared/react_router_helpers';

import { ProductCard } from './';

describe('ProductCard', () => {
  const props = {
    name: 'App Search',
    description: 'Find ya apps here!',
    img: 'img',
    buttonPath: '/app_search',
  };

  it('renders the overview page and product cards', () => {
    const wrapper = shallow(<ProductCard {...props} />);
    const button = wrapper.find(EuiButton);

    expect(wrapper.find(EuiPanel)).toHaveLength(1);
    expect(button.prop('to')).toEqual('/app_search');
    expect(button.prop('data-test-subj')).toEqual('LaunchAppSearchButton');
  });
});
