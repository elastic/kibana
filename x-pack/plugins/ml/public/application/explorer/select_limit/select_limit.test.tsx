/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { shallow } from 'enzyme';
import { SelectLimit } from './select_limit';

jest.useFakeTimers();

describe('SelectLimit', () => {
  test('creates correct initial selected value', () => {
    const wrapper = shallow(<SelectLimit />);
    expect(wrapper.props().value).toEqual(10);
  });

  test('state for currently selected value is updated correctly on click', () => {
    const wrapper = shallow(<SelectLimit />);
    expect(wrapper.props().value).toEqual(10);

    act(() => {
      wrapper.simulate('change', { target: { value: 25 } });
    });
    wrapper.update();

    expect(wrapper.props().value).toEqual(10);
  });
});
