/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import * as React from 'react';

import { TabNavigation } from './';

describe('Tab Navigation', () => {
  test('it mounts with correct tab highlighted', () => {
    const wrapper = shallow(<TabNavigation location={'/hosts'} />);
    const hostsTab = wrapper.find('[data-test-subj="navigation-hosts"]');

    expect(hostsTab.prop('isSelected')).toBeTruthy();
  });
  test('it changes active tab to clicked tab', () => {
    const wrapper = shallow(<TabNavigation location={'/hosts'} />);
    const networkTab = () => wrapper.find('[data-test-subj="navigation-network"]');
    expect(networkTab().prop('isSelected')).toBeFalsy();
    networkTab().simulate('click');
    wrapper.update();
    expect(networkTab().prop('isSelected')).toBeTruthy();
  });
  test('it changes active tab when nav changes by props', () => {
    const wrapper = shallow(<TabNavigation location={'/hosts'} />);
    const networkTab = () => wrapper.find('[data-test-subj="navigation-network"]');
    expect(networkTab().prop('isSelected')).toBeFalsy();
    wrapper.setProps({ location: '/network' });
    wrapper.update();
    expect(networkTab().prop('isSelected')).toBeTruthy();
  });
});
