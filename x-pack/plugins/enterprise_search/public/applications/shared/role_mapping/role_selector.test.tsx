/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiRadio } from '@elastic/eui';

import { RoleSelector } from './role_selector';

describe('RoleSelector', () => {
  const onChange = jest.fn();

  const props = {
    disabled: false,
    disabledText: 'Disabled',
    roleType: 'user',
    roleTypeOption: 'option',
    description: 'This a thing',
    onChange,
  };

  it('renders', () => {
    const wrapper = shallow(<RoleSelector {...props} />);

    expect(wrapper.find(EuiRadio)).toHaveLength(1);
  });

  it('calls method on change', () => {
    const wrapper = shallow(<RoleSelector {...props} />);
    const radio = wrapper.find(EuiRadio);
    radio.simulate('change', { target: { value: 'bar' } });

    expect(onChange).toHaveBeenCalled();
  });

  it('renders callout when disabled', () => {
    const wrapper = shallow(<RoleSelector {...props} disabled />);

    expect(wrapper.find(EuiRadio).prop('checked')).toEqual(false);
  });

  it('sets checked attribute on radio when option matched type', () => {
    const wrapper = shallow(<RoleSelector {...props} roleTypeOption="user" />);
    const radio = wrapper.find(EuiRadio);

    expect(radio.prop('checked')).toEqual(true);
  });
});
