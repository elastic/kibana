/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { SideNavLink } from '../../../../shared/layout';

import { SettingsSubNav } from './settings_sub_nav';

describe('SettingsSubNav', () => {
  it('renders', () => {
    const wrapper = shallow(<SettingsSubNav />);

    expect(wrapper.find(SideNavLink)).toHaveLength(3);
  });
});
