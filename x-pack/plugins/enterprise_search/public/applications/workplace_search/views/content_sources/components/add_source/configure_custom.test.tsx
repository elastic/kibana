/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../../../../__mocks__/shallow_useeffect.mock';
import { setMockActions, setMockValues } from '../../../../../__mocks__';

import React from 'react';
import { shallow } from 'enzyme';

import { EuiForm, EuiFieldText } from '@elastic/eui';

import { ConfigureCustom } from './configure_custom';

describe('ConfigureCustom', () => {
  const advanceStep = jest.fn();
  const setCustomSourceNameValue = jest.fn();

  const props = {
    header: <h1>Header</h1>,
    helpText: 'I bet you could use a hand.',
    advanceStep,
  };

  beforeEach(() => {
    setMockActions({ setCustomSourceNameValue });
    setMockValues({ customSourceNameValue: 'name', buttonLoading: false });
  });

  it('renders', () => {
    const wrapper = shallow(<ConfigureCustom {...props} />);

    expect(wrapper.find(EuiForm)).toHaveLength(1);
  });

  it('handles input change', () => {
    const wrapper = shallow(<ConfigureCustom {...props} />);
    const TEXT = 'changed for the better';
    const input = wrapper.find(EuiFieldText);
    input.simulate('change', { target: { value: TEXT } });

    expect(setCustomSourceNameValue).toHaveBeenCalledWith(TEXT);
  });

  it('handles form submission', () => {
    const wrapper = shallow(<ConfigureCustom {...props} />);

    const preventDefault = jest.fn();
    wrapper.find('form').simulate('submit', { preventDefault });

    expect(preventDefault).toHaveBeenCalled();
    expect(advanceStep).toHaveBeenCalled();
  });
});
