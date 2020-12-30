/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../../__mocks__/enterprise_search_url.mock';

import React from 'react';
import { shallow } from 'enzyme';

import { SideNav, SideNavLink } from '../../../shared/layout';
import { WorkplaceSearchNav } from './';

describe('WorkplaceSearchNav', () => {
  it('renders', () => {
    const wrapper = shallow(<WorkplaceSearchNav />);

    expect(wrapper.find(SideNav)).toHaveLength(1);
    expect(wrapper.find(SideNavLink).first().prop('to')).toEqual('/');
    expect(wrapper.find(SideNavLink)).toHaveLength(7);
  });
});
