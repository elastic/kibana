/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../__mocks__/shallow_usecontext.mock';

import React from 'react';
import { shallow } from 'enzyme';

import { SideNav } from './';

describe('SideNav', () => {
  it('renders', () => {
    const wrapper = shallow(<SideNav />);

    expect(wrapper.type()).toEqual('nav');
    expect(wrapper.find('.enterpriseSearchProduct')).toHaveLength(1);
    expect(wrapper.find('.enterpriseSearchNavLinks')).toHaveLength(1);
  });
});
