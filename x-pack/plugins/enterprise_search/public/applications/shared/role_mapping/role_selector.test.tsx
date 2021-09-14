/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiRadioGroup } from '@elastic/eui';

import { RoleSelector } from './role_selector';

describe('RoleSelector', () => {
  const onChange = jest.fn();
  const roleOptions = [
    {
      id: 'user',
      description: 'User',
    },
  ];

  const props = {
    disabled: false,
    roleType: 'user',
    roleOptions,
    label: 'This a thing',
    onChange,
  };

  it('renders', () => {
    const wrapper = shallow(<RoleSelector {...props} />);

    expect(wrapper.find(EuiRadioGroup)).toHaveLength(1);
  });

  it('calls method on change', () => {
    const wrapper = shallow(<RoleSelector {...props} />);
    const radio = wrapper.find(EuiRadioGroup);
    radio.simulate('change', { target: { value: 'bar' } });

    expect(onChange).toHaveBeenCalled();
  });
});
