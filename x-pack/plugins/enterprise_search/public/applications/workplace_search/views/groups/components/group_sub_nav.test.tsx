/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { SideNavLink } from '../../../../shared/layout';

import { GroupSubNav } from './group_sub_nav';

describe('GroupSubNav', () => {
  it('renders empty when no group id present', () => {
    setMockValues({ group: {} });
    const wrapper = shallow(<GroupSubNav />);

    expect(wrapper.find(SideNavLink)).toHaveLength(0);
  });

  it('renders nav items', () => {
    setMockValues({ group: { id: '1' } });
    const wrapper = shallow(<GroupSubNav />);

    expect(wrapper.find(SideNavLink)).toHaveLength(2);
  });
});
