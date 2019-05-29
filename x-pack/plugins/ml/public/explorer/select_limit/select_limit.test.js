/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { SelectLimit } from './select_limit';

describe('SelectLimit', () => {

  test('creates correct initial selected value', () => {
    const wrapper = shallow(<SelectLimit/>);
    const defaultSelectedValue = wrapper.props().limit.display;
    expect(defaultSelectedValue).toBe('10');
  });

  test('state for currently selected value is updated correctly on click', () => {
    const wrapper = shallow(<SelectLimit/>);
    const select = wrapper.first().shallow();

    const defaultSelectedValue = wrapper.props().limit.display;
    expect(defaultSelectedValue).toBe('10');

    select.simulate('change', { target: { value: '25' } });
    const updatedSelectedValue = wrapper.props().limit.display;
    expect(updatedSelectedValue).toBe('25');
  });

});
