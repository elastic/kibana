/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiButton, EuiText, EuiTitle } from '@elastic/eui';

import { UsersHeading } from '.';

describe('UsersHeading', () => {
  const onClick = jest.fn();

  it('renders', () => {
    const wrapper = shallow(<UsersHeading onClick={onClick} />);

    expect(wrapper.find(EuiText)).toHaveLength(1);
    expect(wrapper.find(EuiTitle)).toHaveLength(1);
  });

  it('handles button click', () => {
    const wrapper = shallow(<UsersHeading onClick={onClick} />);
    wrapper.find(EuiButton).simulate('click');

    expect(onClick).toHaveBeenCalled();
  });
});
