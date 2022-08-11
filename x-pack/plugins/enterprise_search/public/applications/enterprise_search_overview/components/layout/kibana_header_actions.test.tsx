/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { mount } from 'enzyme';

import { EuiPopover, EuiButtonEmpty } from '@elastic/eui';

import { EnterpriseSearchOverviewHeaderActions } from './kibana_header_actions';

describe('Enterprise Search overview HeaderActions', () => {
  it('renders', () => {
    const wrapper = mount(<EnterpriseSearchOverviewHeaderActions />);
    const popover = wrapper.find(EuiPopover);

    expect(popover.find(EuiButtonEmpty).text()).toContain('Deployment details');
    expect(popover.prop('isOpen')).toBeFalsy();
  });

  it('opens popover when clicked', () => {
    const wrapper = mount(<EnterpriseSearchOverviewHeaderActions />);

    expect(wrapper.find(EuiPopover).prop('isOpen')).toBeFalsy();
    wrapper.find(EuiPopover).find(EuiButtonEmpty).simulate('click');
    wrapper.update();

    expect(wrapper.find(EuiPopover).prop('isOpen')).toBeTruthy();
  });
});
